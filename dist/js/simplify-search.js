//common compatible plugin --------------------------------
var compatibleJs = (function(){
  return {
    "warning": _warning,
    "arrayIndexOf": _arrayIndexOf,
    "getKeyinPosition": _getKeyinPosition,
    "setKeyinPosition": _setKeyinPosition,
    "getElementsByAttribute": _getElementsByAttribute,
    "addEventListener": _addEventListener,
    "eventCompatible":_eventCompatible
  };
  function _warning(inText) {
    inText = "Warning:  " + inText;
    if (console !== undefined && console.warn !== undefined) {
      console.warn(inText);
    } else if (config.debugMode === true) { // lte ie8
      alert(inText);
    }
  }

  function _arrayIndexOf(array,param) {
    var i;
    if (array.indexOf) {
      return array.indexOf(param);
    } else { //lte ie8 或 dom
      for (i = 0; i < array.length; i++) {
        if (array[i] == param) {
          return i;
        }
      }
      return -1;
    }

  }

  function _getKeyinPosition(feildNode) {
    // Initialize
    var position = feildNode.value.length; //初始為文字最末端
    //若目前焦點不在 dom 的輸入框中就終止
    if (document.activeElement !== feildNode) {
      return position;
    }
    if (feildNode.selectionStart !== undefined) {
      position = feildNode.selectionStart;
    } else if (document.selection) { // lte ie8

      // Set focus on the element
      feildNode.focus();

      // To get cursor position, get empty selection range
      var oSel = document.selection.createRange();
      // Move selection start to 0 position
      oSel.moveStart('character', -feildNode.value.length);

      // The caret position is selection length
      position = oSel.text.length; //TODO TEST THIS CODE
    }
    // Return results
    return position;
  }

  function _setKeyinPosition(feildNode, position) {
    //若目前焦點不在 dom 的輸入框中就終止
    if (document.activeElement !== feildNode) {
      return ;
    }
    if (feildNode.selectionStart !== undefined) {
      feildNode.selectionStart = position;
      feildNode.selectionEnd = position;
    } else if (document.selection) { // lte ie8
      // Set focus on the element
      feildNode.focus();
      // To get cursor position, get empty selection range
      var oSel = document.selection.createRange();
      // Move selection start to 0 position
      oSel.moveStart('character', -feildNode.value.length+position);
    }

  }

  function _getElementsByAttribute(attribute, value, tagName, parentNode) {
    var tempSelector;
    var tempNodeArr;
    var returnArr = [];
    var i;
    var tempNode;

    if (document.querySelectorAll) {
      tempSelector = ((tagName)? tagName : "") + 
                    "[" + attribute + 
                    ((value !== undefined )? "='" + value + "'" : "") + 
                    "]";
      returnArr = (parentNode || document).querySelectorAll(tempSelector);
    } else { //lte ie7
      tempNodeArr = (parentNode || document).getElementsByTagName((tagName || '*'));
      i = 0;
      while (undefined !== (tempNode = tempNodeArr[i++])) {
        if (value !== undefined && tempNode.getAttribute(attribute) === value) {
          returnArr.push(tempNode);
        } else if (value === undefined && tempNode.getAttribute(attribute)) {
          returnArr.push(tempNode);
        }
      }
      
    }
    return returnArr;
  }

  function _addEventListener(domNode, eventName, callback) {
    if (domNode.addEventListener) {
      domNode.addEventListener(eventName, callback);
    } else { //lte ie8
      domNode.attachEvent("on" + eventName, callback);
    }
  }

  function _eventCompatible(e) {
    e = e || window.event;  //lte ie8 (call by reference!)
    var target = e.target || e.srcElement;
    function preventDefault(){
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
    }
    function stopPropagation(){
      if (e.stopPropagation) {
        e.stopPropagation();
      } else {
        e.cancelBubble = true;
      }
    }
    return {
      "type": e.type,
      "target": target,
      "preventDefault": preventDefault,
      "stopPropagation": stopPropagation,
    };
  }
})();
  

/**
 * 2016.1.18 Maple
 * 
 * javascript 版本 (未使用 JQuery)
 * 1.一定要用表單<form>包裹搜尋選項
 * 2.搜尋的欄位一定要設定 name 屬性，沒有 name 的欄位將會忽略
 * 
 */

function simplifySearch(param) {
  "use strict";
  var uiRandomNo = Math.random().toString().slice(2);
  var config = {
    "formId": param.formId || "" ,
    "autoFeildId": param.autoFeildId || "ssj-" + uiRandomNo,
    "hideForm": (param.hideForm !== undefined)? !!param.hideForm : true,
    "hideTag": (param.hideTag !== undefined)? !!param.hideTag : false,
    "ignoreEmptyValue": (param.ignoreEmptyValue !== undefined)? !!param.ignoreEmptyValue : true,
    "debugMode": (param.debugMode !== undefined)? !!param.debugMode : false ,
    "delay": (param.delay !== undefined)? +param.delay : 300, //TODO
    "autoFeildClass": param.autoFeildClass || "",
    "menuClass": param.menuClass || "ssj-menu",
    "msgClass": param.msgClass || "ssj-msg",
    "tagClass": param.tagClass || "ssj-tag",
    "usePlaceholder": (param.usePlaceholder !== undefined)? !!param.usePlaceholder : true, 
  };
  var nodeDataList = {};
  var autoCompleteList = []; //輸入框內的文字切割物件
  var formNode = document.getElementById(config.formId);
  var autoNode = null; //輸入框
  var menuObj; //選單
  var configRegExpList = []; //dom 可能會重複，若重複則使用最後一次的設定
  var configIgnoreList = [];
  
  var keyinPosition = 0; //輸入框的游標位置（有支援度限制）
  var constKeyCode = {
    "UP": 38,
    "DOWN": 40,
    "SPACE": 32,
    "ENTER": 13,
    "ESC": 27,
    "BACKSPACE": 8,
    "DELETE": 46,
    "TAB": 9,
  };
  //若實作 test() 就可以取代代 RegExp 
  var constRegexp = {
    "ANY": /^.+$/,
    "NUMBER": /^\d+$/,
    "EMAIL": /^[^ @]+@[^ @%]+$/,
    "DATE": {"test": function(text) {
        if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text) === false) {
          return false;
        }
        var temp = new Date(text);
        return !isNaN(temp.valueOf());
      }},
    "TIME": {"test": function(text) {
        if(/^[0-9]{2}:[0-9]{2}$/.test(text) === false) {
          return false;
        }
        var tempArr = text.split(":");
        if (+(tempArr[0]) < 0 || +(tempArr[0]) >= 24) {
          return false;
        }
        if (+(tempArr[1]) < 0 || +(tempArr[1]) > 60) {
          return false;
        }
        return true;
      }},
    "URL":/^\w+:\/\/.*$/,
  };
  var saveInputType = ["text","radio","checkbox","url","email","tel","date","number"];
  var constTagType = {
    "NOALLOW": 0,
    "INPUT_TEXT": 1,
    "INPUT_RADIO": 2,
    "INPUT_CHECKBOX": 3,
    "INPUT_URL": 4,
    "INPUT_EMAIL": 5,
    "INPUT_DATE": 7,
    "INPUT_TIME": 13,
    "INPUT_NUMBER": 8,
    "TEXTAREA": 9,
    "SELECT_ONE": 10, 
    "SELECT_MULTIPLE": 11,
    "OPTION": 12,
  };
  //return 回傳的變數
  var returnParam = {
    "init": init,
    "save": save,
    "reset": reset,
    // "addData": addDomDataMapping, 
    "addRegexpByDom": addRegexpByDom,
    "addRegexpById": addRegexpById,
    "addIgnoreByDom": addIgnoreByDom,
    "addIgnoreById": addIgnoreById,
    "setTitleByName": setTitleByName,
  };

  if (config.debugMode) {
    returnParam.log = logParam;
  }

  function init() {
    
    
    if (formNode === null) {
      throw "not find form (id = " + config.formId + ")";
      // return ;
    }
    if (config.hideForm === true) {
      formNode.style.display = 'none';
    }
    _setAutoInputNode();
    menuObj = new BaseMenu();
    _analysisNodeData(null, true);
    //綁定autoComplete事件
    compatibleJs.addEventListener(autoNode, "keydown", _keyDownEventAction); //抓到游標原始位置
    compatibleJs.addEventListener(autoNode, "keydown", menuObj.controlBaseEvent);//控制選單
    compatibleJs.addEventListener(autoNode, "keyup", _checkWordChange); //輸入法異動只會觸發up事件
    compatibleJs.addEventListener(document, "click",_checkIfBlurAutoComplete);
    compatibleJs.addEventListener(autoNode, "click", _clickInputEventAction);
    return returnParam;
  }
  function save() {
    _saveForm();
  }
  function reset() {
    _resetForm();
  }

  function addRegexpById(id, inRegexp) {
    var tempNode = document.getElementById(id);
    if (tempNode === undefined || tempNode === null) {
      compatibleJs._warning('function addRegexpById : getElementById("' + id + '") no exist');
      return returnParam;
    }
    return addRegexpByDom(tempNode, inRegexp);
  }
  function addRegexpByDom(inNode, inRegexp) {
    if (!(inNode instanceof Element)) {
      throw "param not HTML DOM Nodes";
      // return returnParam;
    }
    if (inRegexp === undefined)
    if (!inRegexp || typeof inRegexp.test !== "function") {
      throw "Param does not have test(), pleast use RegExp object or create function test()";
      // return returnParam;
    }
    _addRegexpDom(inNode, inRegexp);
    return returnParam;
  }
  function addIgnoreById(id) {
    var tempNode = document.getElementById(id);
    if (tempNode === undefined || tempNode === null) {
      compatibleJs._warning('function addIgnoreById : getElementById("' + id + '") no exist');
      return returnParam;
    }
    return addIgnoreByDom(tempNode);
  }
  function addIgnoreByDom(inNode) {
    if (!(inNode instanceof Element)) {
      throw "param not HTML DOM Nodes";
      // return returnParam;
    }
    _addIgnoreNode(inNode);
    return returnParam;
  }
  function setTitleByName(inName, inTitle) {
    var tempName = inName.replace(/\[.*\]/g, ""); //消除[]
    if (nodeDataList[tempName] === undefined) {
      nodeDataList[tempName] = new SSJNodeItemObj();
    }
    nodeDataList[tempName].setTitleFn(inTitle);
    return returnParam;
  }

  function logParam() {
    return {
      "config": config,
      "configRegExpList": configRegExpList,
      "configIgnoreList": configIgnoreList,
      "autoCompleteList": autoCompleteList,
      "nodeDataList": nodeDataList,
      "autoNode": autoNode,
      "menuObj": menuObj,
      "formNode": formNode,
    };
  }
  //analysis data ----------------------------------------
  function _setAutoInputNode() {
    var tempAutoDomNode;
    autoNode = autoNode || document.getElementById(config.autoFeildId);
    //當 id 不存在時要自動新增
    if (autoNode === null) {
      tempAutoDomNode = document.createElement('input');
      tempAutoDomNode.id = config.autoFeildId;
      tempAutoDomNode.type = "input";
      tempAutoDomNode.className = config.autoFeildClass;
      formNode.parentNode.insertBefore(tempAutoDomNode,formNode);
      autoNode = tempAutoDomNode;
    }
    
  }

  function _getLabelTitle(domNode) {
    var customTagType = _getCustomTagType(domNode);
    var tempTitle = "";
    var tempName;
    //不能沒有 name ，若用 id 抓取可能會造成同樣的 name 對應不同的 title
    if (domNode.name === undefined || domNode.name === null || domNode.name === "") {
      return "";
    }
    tempName = domNode.name.replace(/\[.*\]/g, ""); //消除[]
    //若已經設定就用設定的值
    if (nodeDataList[tempName] !== undefined && nodeDataList[tempName].title !== undefined) {
      return nodeDataList[tempName].title;
    }
    //若為 radio / checkbox 就不使用 label 作為 title 的依據
    if (customTagType !== constTagType.INPUT_RADIO && customTagType !== constTagType.INPUT_CHECKBOX) {
      tempTitle = _analysisMappingLabel(domNode, formNode);
      if (
        config.usePlaceholder && 
        tempTitle === "" && 
        (customTagType === constTagType.INPUT_TEXT || customTagType === constTagType.TEXTAREA ) && 
        domNode.getAttribute("placeholder")
      ) {
        tempTitle = domNode.getAttribute("placeholder").trim();
      }
    }
    if ( tempTitle === "" ) {
      tempTitle = tempName; //若沒有指定就直接抓 node.name
    }
    return tempTitle;
  }
  function _analysisNodeData(e, firstFlag, keepDefaultFlag) {
    var i;
    var tempNode;
    var tempTagType;
    var oldNodeDataList = nodeDataList;
    var tempName;
    autoCompleteList = [];
    nodeDataList = {};
    //分析表單內的資料
    i = 0;
    while (undefined !== (tempNode = formNode[i++])) {
      if (tempNode.getAttribute('data-ignore-flag') !== null) {
        continue;
      }
      if (tempNode === autoNode) {
        continue;
      }
      tempTagType = _getCustomTagType(tempNode);
      if (tempTagType === constTagType.NOALLOW) {
        continue;
      }
      //disabled 有設定時，值可能為 "" 或 "disabled"，因此用 != null 判斷
      if ((tempNode.getAttribute('disabled') !== null && 
        (tempNode.getAttribute('disabled') === "disabled" || 
        tempNode.getAttribute('disabled') === "")) || 
        (tempNode.getAttribute('readonly') !== null &&
        (tempNode.getAttribute('readonly') === "disabled" ||
        tempNode.getAttribute('readonly') === ""))
      ) {
        continue;
      }
      switch (tempTagType) {
        case constTagType.INPUT_NUMBER:
        case constTagType.INPUT_DATE:
        case constTagType.INPUT_TIME:
          _addNodeDataList(new TextObj(tempNode));
          if (firstFlag) {
            compatibleJs.addEventListener(tempNode,'change',_analysisNodeData);
          }
          break;
        case constTagType.INPUT_EMAIL:
        case constTagType.INPUT_URL:
        case constTagType.TEXTAREA:
        case constTagType.INPUT_TEXT:
          _addNodeDataList(new TextObj(tempNode));
          if (firstFlag) {
            compatibleJs.addEventListener(tempNode,'blur',_changeNodeValueEvent);
          }
          break;
        case constTagType.INPUT_RADIO:
        case constTagType.INPUT_CHECKBOX:
          _addNodeDataList(new CheckObj(tempNode));
          if (firstFlag) {
            compatibleJs.addEventListener(tempNode,'change',_changeNodeValueEvent);
          }
          break;
        case constTagType.SELECT_ONE:
        case constTagType.SELECT_MULTIPLE:
          _analysisSelect(tempNode);
          if (firstFlag) {
            compatibleJs.addEventListener(tempNode,'change',_changeNodeValueEvent);
          }
          break;
      }
    }
    if (keepDefaultFlag) {
      for (tempName in nodeDataList) {
        nodeDataList[tempName].defaultArr = oldNodeDataList[tempName].defaultArr;
      }
    }
    _setAutoCompleteWord();
  }
  function _changeNodeValueEvent(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var tempNode = tempEvent.target;
    var tempName;
    var tempTagType;

    if (tempNode === undefined || tempNode === null || tempNode.name === undefined) {
      _analysisNodeData(null, false, true);
      return ;
    }
    tempTagType = _getCustomTagType(tempNode);
    tempName = tempNode.name.replace(/\[.*\]/g, "");
    
    switch (tempTagType) {
      case constTagType.INPUT_NUMBER:
      case constTagType.INPUT_DATE:
      case constTagType.INPUT_TIME:
      case constTagType.INPUT_EMAIL:
      case constTagType.INPUT_URL:
      case constTagType.TEXTAREA:
      case constTagType.INPUT_TEXT:
        nodeDataList[tempName].changeItemObjFn(new TextObj(tempNode));
        
        break;
      case constTagType.INPUT_RADIO:
      case constTagType.INPUT_CHECKBOX:
        nodeDataList[tempName].changeItemObjFn(new CheckObj(tempNode));
        break;
      case constTagType.SELECT_ONE:
      case constTagType.SELECT_MULTIPLE:
        _analysisSelect(tempNode, true);
        break;
      default:
        compatibleJs._warning('TagType of node is unknow.');
        return;
    }
    _resetAutoComleteWord();
    return;
    
  }
  function _addNodeDataList(itemObj,parentNode) {
    var tempName = itemObj.name;
    if (nodeDataList[tempName] === undefined) {
      nodeDataList[tempName] = new SSJNodeItemObj();
    }
    nodeDataList[tempName].addItemObjFn(itemObj,parentNode);
    if (itemObj.usedFlag) {
      autoCompleteList.push(new autoCompleteItemObj(itemObj.text, itemObj));
    }
  }

  function _analysisMappingLabel(domNode, parentNode) {
    var tempName;
    //包住 domNode 的 label 優先
    if (domNode.parentNode.tagName == 'LABEL') {
      tempName = domNode.parentNode.textContent.trim();
      return tempName;
    }
    if (!domNode.id) {
      return "";
    }
    //在 form 中找尋設定 for 的 label
    var tempLabelArr = compatibleJs.getElementsByAttribute('for', domNode.id, 'label', parentNode);
    if (tempLabelArr.length != 1) {
      return ""; //多個 label 就不設定
    } else {
      tempName = tempLabelArr[0].textContent.trim();
      return tempName;
    }
  }
  function _analysisSelect(domNode, keepDefaultFlag) {
    var tempObj;
    var tempName = domNode.name.replace(/\[.*\]/g, "");
    var oldNodeDataListObj;
    var tempMultiple = ((domNode.getAttribute('multiple') !== null)? true : false);
    if (domNode.length == 1) {
      return;
    }
    oldNodeDataListObj = nodeDataList[tempName];
    nodeDataList[tempName] = undefined;
    for (var i = 0; i < domNode.length; i++) {
      if (config.ignoreEmptyValue === true && 
          (domNode[i].value === '' || domNode[i].value === undefined || domNode[i].value === null)
        ) {
        continue;
      }
      if (domNode[i].getAttribute('disabled') !== null && 
        domNode[i].getAttribute('disabled') !== "disabled" && 
        domNode[i].getAttribute('disabled') !== "") {
        continue;
      }
      if (domNode[i].tagName == "OPTION") { //排除 <optgroup>
        tempObj = new OptionObj(i, tempName, tempMultiple, domNode[i]);
        _addNodeDataList(tempObj,domNode);
      }
    }
    if (keepDefaultFlag) {
      nodeDataList[tempName].defaultArr = oldNodeDataListObj.defaultArr;
    }
  }

  function _getCustomTagType(domNode) {
    var tempType;
    if (domNode === undefined || domNode === null) {
      return constTagType.NOALLOW;
    }
    switch (domNode.tagName) {
      case "SELECT":
        if (domNode.getAttribute('multiple')) {
          return constTagType.SELECT_MULTIPLE;
        }
        return constTagType.SELECT_ONE;
      case "INPUT":
        if (domNode.getAttribute('type')) {
          tempType = domNode.type.toLowerCase();
        }
        if ( !tempType || tempType == "text") {
          return constTagType.INPUT_TEXT;
        } else if (tempType == "radio") {
          return constTagType.INPUT_RADIO;
        } else if (tempType == "checkbox") {
          return constTagType.INPUT_CHECKBOX;
        } else if (tempType == "number") {
          return constTagType.INPUT_NUMBER;
        } else if (tempType == "date") {
          return constTagType.INPUT_DATE;
        } else if (tempType == "time") {
          return constTagType.INPUT_TIME;
        } else if (tempType == "email") {
          return constTagType.INPUT_EMAIL;
        } else if (tempType == "url") {
          return constTagType.INPUT_URL;
        }
        return constTagType.NOALLOW;
      case "TEXTAREA":
        return constTagType.TEXTAREA;
      case "OPTION":
        return constTagType.OPTION;
      default:
        return constTagType.NOALLOW;
    }
    
  }
  function _addIgnoreNode(domNode) {
    var tempName;
    var tempParent;
    if ( constTagType.NOALLOW === _getCustomTagType(domNode)) {
      compatibleJs._warning("Not allow " + domNode.tagName);
      return false;
    }
    if (domNode.tagName == "OPTION") {
      tempParent = domNode.parentNode;
      if (tempParent.tagName == "OPTGROUP") {
        tempParent = tempParent.parentNode;
      }
      if (tempParent.tagName == "SELECT" &&  tempParent.name !== undefined) {
        tempName = tempParent.name.replace(/\[.*\]/g, "");
      } else {
        compatibleJs._warning("No find parent node <select>, so failed to ignore <option>");
        return false;
      }
    } else if (domNode.name !== undefined) {
      tempName = domNode.name.replace(/\[.*\]/g, "");
    }
    if (tempName === undefined) {
      compatibleJs._warning("This node doesn't have name");
      return false;
    }
    if (nodeDataList[tempName] !== undefined) {
      if (domNode.tagName == "SELECT") {
        if (nodeDataList[tempName].parentNode === domNode) {
          nodeDataList[tempName] = undefined;
        }
      } else {
        nodeDataList[tempName].removeItemObjFn(domNode);
      }
    }

    if (compatibleJs.arrayIndexOf(configIgnoreList, domNode)== -1) {
      domNode.setAttribute('data-ignore-flag', configIgnoreList.length);
      configIgnoreList.push(domNode);
    }
    return true;

  }

  function _addRegexpDom(domNode, regexp) {
    var type;
    var tempName; 
    if (domNode.tagName != "INPUT" && domNode.tagName != "TEXTAREA") {
      return false;
    } else if (domNode.tagName == "INPUT") {
      type = domNode.type;
      if (type !== undefined) {
        type = type.toLowerCase();
        if (compatibleJs.arrayIndexOf(saveInputType, type) == -1) {
          return false;
        }
      }
      if (type == "radio" || type == "checkbox") {
        return false;
      }
    }
    tempName = domNode.name.replace(/\[.*\]/g, "");
    if (nodeDataList[tempName] !== undefined) {
      nodeDataList[tempName].changeRegexpFn(domNode, regexp);
    }
    
    domNode.setAttribute('data-regexp-flag',configRegExpList.length);
    configRegExpList.push({"node": domNode, "regexp": regexp}); //不處理重複，以最後設定為主
    return true;
  }

  //keyin & menu event control --------------------------
  function _keyDownEventAction(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    keyinPosition = compatibleJs.getKeyinPosition(autoNode);
    if (menuObj.getMenuNodeFn() === null && e.keyCode === constKeyCode.DOWN){
      tempEvent.preventDefault();
    }
  }

  function _clickInputEventAction(e) {
    _keyDownEventAction(e);
    // var tempEvent = compatibleJs.eventCompatible(e);
    var tempSlice;
    var i;
    var tempAutoObj;
    if (menuObj.getMenuNodeFn() === null) {
      tempSlice = autoNode.value.slice(0,keyinPosition).length;
      i = autoCompleteList.length;
      while (undefined !== (tempAutoObj =  autoCompleteList[--i])) {
        if (tempAutoObj.sort <= tempSlice) {
          if (tempAutoObj.sort + tempAutoObj.getTextFn().length >= tempSlice) {
            _selectAutoComplete(i, true);
          }
          
          break;
        }
      }
    }
  }

  function _checkIfBlurAutoComplete(e) {
    var tempEvent = compatibleJs.eventCompatible(e); 
    if (document.activeElement !== autoNode && tempEvent.target !== autoNode) {
        _removeInvalidWord(e);
    }
  }

  function _checkWordChange(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var inputText = autoNode.value.trim();
    var tempList = [];
    var tempRemoveList = [];
    var diffFlag = false;
    var tempWIndex;
    var tempWEnd;
    var tempWord;
    var i;
    var tempAutoObj;
    var tempObj;
    var tempName;
    var tempSlice;
    if (inputText === "") { //清空輸入框
      diffFlag = true;
      tempRemoveList = autoCompleteList;
    } else {
      //文字片段可能會涵蓋空白，因此必須先判斷已選的文字，切割判斷完後再判斷剩下的
      inputText = " " + inputText + " ";

      i = 0;
      while (undefined !== (tempAutoObj = autoCompleteList[i++])) {
        if (tempAutoObj === undefined) {
          continue;
        }
        tempWord = " " + tempAutoObj.getTextFn() + " ";
        tempWIndex = inputText.indexOf(tempWord);
        if (tempWIndex !== -1) {
          inputText = inputText.replace(tempWord, new Array(tempWord.length + 1).join(" ")); //only replace first word
          tempAutoObj.sort = tempWIndex;
          tempList.push(tempAutoObj);
        } else {
          diffFlag = true;
          tempRemoveList.push(tempAutoObj);
        }
      }
      //剩下的文字就是新增的資料
      while (inputText.trim() !== "") {
        diffFlag = true;
        tempWIndex = inputText.search(/\S/i);
        tempWEnd = inputText.indexOf(" ",tempWIndex);
        tempWord = inputText.substring(tempWIndex,tempWEnd);
        inputText = inputText.replace(tempWord, new Array(tempWord.length + 1).join(" ")); //only replace first word
        tempAutoObj = new autoCompleteItemObj(tempWord);
        tempAutoObj.sort = tempWIndex;
        tempList.push(tempAutoObj);
      }
      tempList.sort(function(a, b) {
        return a.sort - b.sort;
      }); 
    }
    //END
    if (diffFlag) {
      //清空表單選擇
      i = 0;
      while (undefined !== (tempAutoObj = tempRemoveList[i++])) {
        tempObj = tempAutoObj.getObjFn();
        if (tempObj !== undefined) {
          tempName = tempObj.name;
          tempObj.cancelFn(); //tempObj.usedFlag = false;
          tempAutoObj.removeObjFn();
        }
      }
      menuObj.removeMenuNodeFn();
      autoCompleteList = tempList;
      _checkAutoComplete();
    } else {
      if (menuObj.getMenuNodeFn() === null) { 
        switch (e.keyCode) {
          case constKeyCode.SPACE:
            //空白若是落在文字中就不會是diffFlag=false
            //如果空白前後有未設定的 autoObj 就不執行清除
            tempSlice = autoNode.value.slice(0, keyinPosition).length;
            i = autoCompleteList.length;
            while (undefined !== (tempAutoObj = autoCompleteList[--i])) {
              if (
                (tempSlice < tempAutoObj.sort && tempSlice >= tempAutoObj.sort - 2) && //判斷空白落在那個片段之前
                tempAutoObj.getObjFn() !== undefined && 
                autoCompleteList[i - 1].getObjFn() !== undefined
                ) {
                  _removeInvalidWord(e, i - 1);
                  break;
              } else if (tempSlice > tempAutoObj.sort - 2) {
                break; //while
              }   
            }
            break; //switch

          case constKeyCode.TAB:
            _removeInvalidWord(e);
            break;
          case constKeyCode.DOWN:
            tempSlice = autoNode.value.slice(0, keyinPosition).length;
            i = autoCompleteList.length;
            while (undefined !== (tempAutoObj =  autoCompleteList[--i])) {
              if (tempAutoObj.sort <= tempSlice) {
                if (tempAutoObj.sort + tempAutoObj.getTextFn().length >= tempSlice) {
                  _selectAutoComplete(i, true);
                  tempEvent.preventDefault();
                }
                
                break;
              }
            }
        }
      }
    }
  }


  function _checkAutoComplete(start) {
    var tempReturn;
    var i = ( start !== undefined && start < autoCompleteList.length - 1)? start : autoCompleteList.length - 1; 
    for (; i >= 0; i--) {
      tempReturn = _selectAutoComplete(i);
      if (tempReturn !== true && tempReturn !== false && /^\d+$/.test(tempReturn)) {
        i = tempReturn;
      }
    }
  }

  function _selectAutoComplete(autoObjIndex, resetFlag) {
    var tempFocusAutoObj = autoCompleteList[autoObjIndex];
    var tempAutoObj;
    var rangeArr = [];
    var i;
    var tempWords;
    var keepMappingKey = [];
    var tempName;
    var tempObj;
    var tempSort; //like weights ,but smaller first
    if (tempFocusAutoObj === undefined) {
      return false;
    }
    //抓取前後未指定obj的輸入值
    rangeArr.push(autoObjIndex);
    if (tempFocusAutoObj.getObjFn() !== undefined) {
      if (resetFlag !== true) {
        return false;
      } else {
        tempName = tempFocusAutoObj.getObjFn().name;
        
        if (nodeDataList[tempName] === undefined) {
          return false;
        }
        i = -1;
        while (undefined !== (tempObj = nodeDataList[tempName].itemObjs[++i])) {
          if (tempObj.usedFlag) {
            if (tempObj === tempFocusAutoObj.getObjFn()) {
              tempWords = {"name": tempName, "index": i, "sort": -1};
            }
            continue;
          } 
          keepMappingKey.push({"name": tempName, "index": i, "sort": i});
        }
        menuObj.createChangeMenuFn(tempWords, rangeArr, keepMappingKey);
        return true;
      }
    }
    tempWords = tempFocusAutoObj.getTextFn();
    i = autoObjIndex;
    while (undefined !== (tempAutoObj = autoCompleteList[--i])) {
      if (tempAutoObj.getObjFn() === undefined) {
        rangeArr.unshift(i);
        tempWords = tempAutoObj.getTextFn() + " " + tempWords;
      } else {
        break;
      }
    }
    i = autoObjIndex;
    while (undefined !== (tempAutoObj = autoCompleteList[++i])) {
      if (tempAutoObj.getObjFn() === undefined) {
        rangeArr.push(i);
        tempWords = tempWords + " " + tempAutoObj.getTextFn();
      } else {
        break;
      }
    }
    for (tempName in nodeDataList) {
      if (nodeDataList[tempName] === undefined || nodeDataList[tempName].noShowInMenuFlag) {
        continue;
      }
      i = -1;
      while (undefined !== (tempObj = nodeDataList[tempName].itemObjs[++i])) {
        if (tempObj.usedFlag) {
          continue;
        } 
        if (tempObj instanceof TextObj) {
          if (tempObj.checkRuleFn(tempWords) === true) {
            if (tempObj.regexp === constRegexp.ANY) {
              tempSort = 500;
            } else {
              tempSort = 100;
            }
            keepMappingKey.push({"name": tempName, "index": i, "sort": tempSort});
          }
        } else if (tempObj instanceof ItemObj) {
          if (tempObj.text.toLowerCase().indexOf(tempWords.valueOf().toLowerCase()) !== -1) {
            if (tempObj.text.length == tempWords.valueOf().length) {
              tempSort = 1;
            } else {
              tempSort = 1000;
            }
            keepMappingKey.push({"name": tempName, "index": i, "sort":tempSort});

          }
        } else {
          compatibleJs._warning("unknow ItemObj class");
        }
      }
    }
    keepMappingKey.sort(function(a, b) {
      return a.sort - b.sort;
    });
    if (keepMappingKey.length === 0) {
      menuObj.removeMenuNodeFn();
      menuObj.createMsgMenuFn(tempWords, rangeArr);
      return -1;
    } else {
      menuObj.createSelectMenuFn(tempWords, rangeArr, keepMappingKey);
      return true;
    }
  }
  /**
   * @param  int autoItemIndex 片語的編號（注意有可能為 -1）
   * @param  boolean addSpaceFlag  在片語編號後方加入一個空白
   * @return string
   */
  function _getAutoCompleteWords(autoItemIndex, addSpaceFlag) {
    var tempText = "";
    if (autoItemIndex === -1 && addSpaceFlag) {
      tempText = " ";
    }
    for (var i = 0; i < autoCompleteList.length; i++) {
      autoCompleteList[i].sort = tempText.length;
      tempText = tempText + autoCompleteList[i].getTextFn() + " ";
      if (autoItemIndex === i && addSpaceFlag) {
        tempText = tempText + " ";
      }
    }
    return tempText;
  }
  /**
   * 設定 auto complete 整個句子外，還可指定游標位置
   * @param  int autoItemIndex 片語的編號 (注意有可能為 -1)
   * @param  boolean addSpaceFlag  在片語編號後方加入一個空白且游標在空白後
   * @return void
   */
  function _setAutoCompleteWord(autoItemIndex, addSpaceFlag) {
    var tempAutoObj;
    var newPosition;
    autoNode.value = _getAutoCompleteWords(autoItemIndex, addSpaceFlag);
    if (autoItemIndex === -1) {
      if (addSpaceFlag) {
        compatibleJs.setKeyinPosition(autoNode, 0);
      }
    } else if (autoItemIndex !== undefined) {
      tempAutoObj = autoCompleteList[autoItemIndex];
      newPosition = tempAutoObj.sort + tempAutoObj.getTextFn().length + ((addSpaceFlag)? 1 : 0);
      compatibleJs.setKeyinPosition(autoNode, newPosition);
    }
  }
  function _resetAutoComleteWord() {
    var tempName;
    var tempObj;
    var i;
    autoCompleteList = [];
    for(tempName in nodeDataList) {
      if (nodeDataList[tempName].multiple === false && nodeDataList[tempName].noShowInMenuFlag === false) {
        continue;
      }
      i = 0;
      while (undefined !== (tempObj = nodeDataList[tempName].itemObjs[i++])) {
        if (tempObj.usedFlag === true) {
          autoCompleteList.push(new autoCompleteItemObj(tempObj.text, tempObj));
          if (nodeDataList[tempName].multiple === false) {
            break;
          }
        }
      }
    }
    _setAutoCompleteWord();
  }
  function _removeInvalidWord(e, autoObjIndex) {
    var tempAutoObj;
    var newAutoComleteList = [];
    var cutLength = 0;
    var i;
    i = 0;
    while (undefined !== (tempAutoObj = autoCompleteList[i++])) {
      if (tempAutoObj.getObjFn() === undefined) {
        cutLength = cutLength + tempAutoObj.getTextFn().length + 1;
      } else {
        tempAutoObj.sort = tempAutoObj.sort - cutLength;
        newAutoComleteList.push(tempAutoObj);
      }
    }
    if (autoCompleteList.length != newAutoComleteList.length) {
      autoCompleteList = newAutoComleteList;
      if (autoObjIndex !== undefined) {
        _setAutoCompleteWord(autoObjIndex, true);
      } else {
        _setAutoCompleteWord();
      }
      menuObj.removeMenuNodeFn('select');
    
    }
    menuObj.removeMenuNodeFn('msg');
  
  }
  function _saveForm() {
    var tempName;
    var tempObj;
    var i;
    for (tempName in nodeDataList) {
      //將目前選定的值設為 defaultArr
      nodeDataList[tempName].defaultArr = [];
      if (nodeDataList[tempName].multiple === false && nodeDataList[tempName].noShowInMenuFlag === false) {
         continue; //代表沒有設值，可以直接忽略輪巡
      }
      i = 0;
      while (undefined !== (tempObj = nodeDataList[tempName].itemObjs[i++])) {
        if (tempObj.usedFlag === true) {
          if (tempObj instanceof TextObj) {
            nodeDataList[tempName].defaultArr.push(tempObj.value);
          } else {
            nodeDataList[tempName].defaultArr.push(tempObj.node);
          }
        } 
      }
    }
  }
  function _resetForm() {
    var tempName;
    var tempObj;
    var tempDefaultValue;
    var i;
    var tempUesdFlag;
    for (tempName in nodeDataList) {
      tempUesdFlag = false;
      i = -1;
      while (undefined !== (tempObj = nodeDataList[tempName].itemObjs[++i])) { 
        if (tempObj instanceof TextObj) {
          tempDefaultValue = nodeDataList[tempName].defaultArr[i];
          if (tempDefaultValue === undefined || tempDefaultValue === "") {
            tempObj.cancelFn();
          } else{
            tempObj.setTextFn(tempDefaultValue);
            tempObj.activeFn();
            tempUesdFlag = true;
          }    
        } else if (tempObj instanceof CheckObj || tempObj instanceof OptionObj) {
          if (compatibleJs.arrayIndexOf(nodeDataList[tempName].defaultArr, tempObj.node) !== -1) {
            tempObj.activeFn();
            tempUesdFlag = true;
          } else {
            tempObj.cancelFn();
          }
        }
      }
      if (tempUesdFlag === true && nodeDataList[tempName].multiple === false) {
        nodeDataList[tempName].noShowInMenuFlag = true;
      } else {
        nodeDataList[tempName].noShowInMenuFlag = false;
      }
    }
    _resetAutoComleteWord();
  }

  //Object class ----------------------------------
  function SSJNodeItemObj() {
    this.title = undefined;
    this.defaultArr = [];
    this.multiple = false;
    this.noShowInMenuFlag = false;
    this.itemObjs = [];
    this.parentNode = null;

  }
  SSJNodeItemObj.prototype.setTitleFn = function(inTitle) {
    this.title = inTitle;
  };
  //when addIgnoreById or addIgnoreByDom 
  SSJNodeItemObj.prototype.removeItemObjFn = function(domNode) {
    var i;
    var tempObj;
    var tempIndex;
    if (domNode.tagName == "SELECT") {
      return;
    } else {
      i = -1;
      while (undefined !== (tempObj = this.itemObjs[++i])) {
        if (tempObj.node === domNode) {
          this.itemObjs.splice(i,1);
          //刪除預設值的設定
          if (tempObj instanceof TextObj) {
            this.defaultArr.splice(i,1);
          } else {
            tempIndex = compatibleJs.arrayIndexOf(this.defaultArr, domNode);
            if (tempIndex !== -1) {
              this.defaultArr.splice(tempIndex,1);
            }
          }
          break;
        }
      }
    }
  };
  SSJNodeItemObj.prototype.changeRegexpFn = function(domNode, regexp) {
    var tempObj;
    var i = -1;
    while (undefined !== (tempObj = this.itemObjs[++i])) {
      if (!(tempObj instanceof TextObj)) {
        compatibleJs._warning("This dom cannot set RegExp");
        return;
      }
      if (tempObj.node === domNode) {
        tempObj.setRegexpFn(regexp);
        if (!tempObj.checkRuleFn(this.defaultArr[i])) {
          compatibleJs._warning("Text default value be cleared! because does not match for new RegExp.");
          this.defaultArr[i] = "";
        }
        break;
      }
    }
  };

  SSJNodeItemObj.prototype.addItemObjFn = function(itemObj, inParentNode) {
    var i;
    var tempNode;
    //建立預設值
    this.title = this.title || _getLabelTitle(inParentNode || itemObj.node);
    this.multiple = this.multiple || itemObj.multiple;

    //增加 itemObj
    this.itemObjs.push(itemObj);
    //調整 defaultArr, noShowInMenuFlag

    if (itemObj instanceof TextObj) {
      //text 對應 index 儲存目前文字
      this.defaultArr.push(itemObj.value);
      if (itemObj.usedFlag && !this.multiple) {
        this.noShowInMenuFlag = true;
      }
    } else if (itemObj instanceof OptionObj) {
      if (this.parentNode === null && inParentNode !== undefined) {
        this.parentNode = inParentNode;
      }
      if (this.defaultArr.length === 0) {
        //不論 config.ignoreEmptyValue 是否有排除，都要記錄預設選項
        i = 0;
        while (undefined !== (tempNode = inParentNode.selectedOptions[i++])) {
          this.defaultArr.push(tempNode);
        }
      }
      if (itemObj.usedFlag) {
        if (!this.multiple) {
          this.noShowInMenuFlag = true;
        }
      }   
    } else if (itemObj instanceof ItemObj) {
      if (itemObj.usedFlag) {
        this.defaultArr.push(itemObj.node);
        if (!this.multiple) {
          this.noShowInMenuFlag = true;
        }
      }
    } 
  };
  SSJNodeItemObj.prototype.changeItemObjFn = function(inItemObj) {

    var i;
    var tempObj;
    i = -1;
    while (undefined !== (tempObj = this.itemObjs[++i])) {
      if (tempObj.node === inItemObj.node) {
        this.itemObjs[i] = inItemObj;
        if (this.multiple === false && tempObj.usedFlag !== inItemObj.usedFlag) {
          this.noShowInMenuFlag = inItemObj.usedFlag;
        }
        break;
      }
    }
    //不檢查也不更換 autoCompleteList ，請自行呼叫 reset
  };
  SSJNodeItemObj.prototype.checkNoShowFlagFn = function(actionType) {
    if (this.multiple) {
      this.noShowInMenuFlag = false;
      return;
    }
    if (actionType === true) {
      this.noShowInMenuFlag = true;
      return;
    }
    if (actionType === false) {
      this.noShowInMenuFlag = false;
      return;
    }
    var tempItemObj;
    var i = 0;
    while (undefined !== (tempItemObj = this.itemObjs[i++])) {
      if (tempItemObj.usedFlag === true) {
        this.noShowInMenuFlag = true;
        return;
      }
    }
    this.noShowInMenuFlag = false;
  };

  function autoCompleteItemObj(inText, inObj) {
    var text = inText;
    var custemObj = inObj; //extend ItemObj
    this.sort = 0;
    
    this.setObjFn = function(inObj) {
      var oldCustemObj;
      if (!(inObj instanceof ItemObj)) {
        compatibleJs._warning('setObjFn: argument is not ItemObj');
        return ;
      }
      if (custemObj !== undefined) {
        oldCustemObj = custemObj;
        oldCustemObj.cancelFn();
      }
      text = inObj.text;
      custemObj = inObj;
      custemObj.activeFn();
      nodeDataList[custemObj.name].checkNoShowFlagFn(true);
      if (oldCustemObj !== undefined && custemObj.name !== oldCustemObj.name) {
        nodeDataList[oldCustemObj.name].checkNoShowFlagFn(false);
      }
    };
    this.getObjFn = function() {
      return custemObj;
    };
    this.setTextFn = function(inText) {
      text = inText;
    };
    this.getTextFn = function() {
      return text;
    };
    this.removeObjFn = function() {
      if (custemObj === undefined) {
        return;
      }
      custemObj.cancelFn();
      nodeDataList[custemObj.name].checkNoShowFlagFn(false);
      custemObj = undefined;
    };
  }

  //ItemObj class
  function ItemObj(DomNode){
    this.node = DomNode;
    this.name = (DomNode.name !== undefined)? DomNode.name.replace(/\[.*\]/g, ""): undefined; //消除[]
    this.multiple = (this.name !== DomNode.name)? true : false;
    this.usedFlag = false;
    this.text = undefined;
    this.value = DomNode.value;
  }
  ItemObj.prototype.activeFn = function () {
    this.usedFlag = true;
  };
  ItemObj.prototype.cancelFn = function() {
    this.usedFlag = false;
  };

  //TextObj class
  function TextObj(inputDomNode) {
    ItemObj.call(this, inputDomNode);
    var regexpIndex = inputDomNode.getAttribute('data-regexp-flag');
    var tempTagType = _getCustomTagType(inputDomNode);
    var i;
    //增加判斷 maxlength 屬性
    this.regexp = undefined; 
    this.maxlength = inputDomNode.getAttribute('maxlength');
    this.min = inputDomNode.getAttribute('min'); //number or date
    this.max = inputDomNode.getAttribute('max');
    if (this.maxlength === null || this.maxlength < 0) {
      this.maxlength = NaN;
    }
    //inputDomNode.getAttribute('data-regexp')
    if (regexpIndex !== null) {
      if (configRegExpList[regexpIndex] !== undefined && configRegExpList[regexpIndex].node === inputDomNode) {
        this.regexp = configRegExpList[regexpIndex].regexp;
      } else {
        //異常，可能是被改資料，進入容錯處理
        for (i = configRegExpList.length - 1; i >= 0; i++) {
          if (configRegExpList[i].node === inputDomNode) {
            this.regexp = configRegExpList[i].regexp;
            break;
          }
        }
      }
    }
    if (this.regexp === undefined) {
      switch (tempTagType) {
        case constTagType.INPUT_NUMBER:
          this.regexp = constRegexp.NUMBER;
          if (this.min !== null) {
            this.min = +(this.min);
          }
          if (this.max !== null) {
            this.max = +(this.max);
          }
          break;
        case constTagType.INPUT_URL:
          this.regexp = constRegexp.URL;
          break;
        case constTagType.INPUT_EMAIL:
          this.regexp = constRegexp.EMAIL;
          break;
        case constTagType.INPUT_DATE:
          this.regexp = constRegexp.DATE;
          break;
        case constTagType.INPUT_TIME:
          this.regexp = constRegexp.TIME;
          break;
        default:
          this.regexp = constRegexp.ANY;
          break;
      }      
    }
    if (this.node.value !== "") {
      if (this.regexp.test(this.node.value) === true) {
        this.text = this.node.value;
      } else {
        compatibleJs._warning("value of [name=" + inputDomNode.name + "] don't match regexp, so delete the value");
        this.node.value = "";
      }
    }
    this.usedFlag = (this.node.value !== "")? true: false;
  }
  TextObj.prototype = Object.create(ItemObj.prototype); // Set prototype to ItemObj
  TextObj.prototype.constructor = TextObj; // Set constructor back to TextObj
  //TextObj class prototype
  TextObj.prototype.activeFn = function () {
    ItemObj.prototype.activeFn.call(this);
    this.node.value = this.text;

  };
  TextObj.prototype.cancelFn = function () {
    ItemObj.prototype.cancelFn.call(this);
    this.node.value = "";
    this.text = "";
  };
  TextObj.prototype.setTextFn = function (text) {
    this.text = text;
  };
  TextObj.prototype.setRegexpFn = function (regexp) {
    this.regexp = regexp;
  };

  TextObj.prototype.checkRuleFn = function (text) {
    if (this.regexp.test(text) !== true) {
      return false;
    }
    if (isNaN(this.maxlength) === false && text.length > this.maxlength) {
      return false;
    }

    if (this.min !== null && text < this.min) {
      return false;
    }
    if (this.max !== null && text > this.max) {

      return false;
    }
    return true;
  };


  //OptionObj class
  function OptionObj(index, inName, inMultiple, optionDomNode) {
    ItemObj.call(this, optionDomNode);
    this.name = inName; //消除[]
    this.selectedIndex = index;
    this.usedFlag = (optionDomNode.selected === true)? true: false;
    this.text = optionDomNode.text;
    this.multiple = inMultiple;
  }
  OptionObj.prototype = Object.create(ItemObj.prototype); // Set prototype to ItemObj
  OptionObj.prototype.constructor = OptionObj; // Set constructor back to OptionObj
  //OptionObj class prototype
  OptionObj.prototype.activeFn = function () {
    ItemObj.prototype.activeFn.call(this);
    this.node.selected = true;
  };
  OptionObj.prototype.cancelFn = function () {
    ItemObj.prototype.cancelFn.call(this);
    this.node.selected = false;
  };
  

  //CheckObj class
  function CheckObj(checkboxNode) {
    ItemObj.call(this, checkboxNode);
    this.usedFlag = (checkboxNode.checked === true)? true: false;
    this.text = _analysisMappingLabel(checkboxNode, formNode);
    if (this.text === "") {
      this.text = this.value;
    }
  }
  CheckObj.prototype = Object.create(ItemObj.prototype); // Set prototype to ItemObj
  CheckObj.prototype.constructor = CheckObj; // Set constructor back to CheckObj
  //CheckObj class prototype
  CheckObj.prototype.activeFn = function() {
    ItemObj.prototype.activeFn.call(this);
    this.node.checked = true;
  };
  CheckObj.prototype.cancelFn = function() {
    ItemObj.prototype.cancelFn.call(this);
    this.node.checked = false;
  };
  
  //BaseMenu class
  function BaseMenu(){
    var menuNode = null;
    var type = '';

    this.height = autoNode.offsetHeight || autoNode.clientHeight; 
    this.width = autoNode.offsetWidth || autoNode.clientWidth;
    this.top = autoNode.offsetTop || autoNode.clientTop; 
    this.left = autoNode.offsetLeft || autoNode.clientLeft;
    this.tagClass = config.tagClass;

    
    this.id = "ssj-menu-" + uiRandomNo; 
    this.class = config.menuClass;
    this.hideTag = config.hideTag;
    this.firstItemHideFlag = true; 

    this.setTypeFn = function(inType){
      type = inType;
    };
    this.getTypeFn = function(){
      return type;
    };
    this.setMenuNodeFn = function(inMenuNode){
      if (menuNode !== null) {
        this.removeMenuNodeFn();
      }
      menuNode = inMenuNode;
      autoNode.parentNode.appendChild(inMenuNode);
    };
    this.getMenuNodeFn = function(){
      return menuNode;
    };
    this.removeMenuNodeFn = function(inType){
      if (inType !== undefined && type != inType) {
        return;
      }
      if (menuNode !== null) {
        menuNode.remove();
        menuNode = null;
        type = '';
      }
    };
  }
  
  BaseMenu.prototype.createBaseMenuFn = function(defaultWord, autoItemIndexArr, keepMappingKey, clickEvent) {  
    if (this.getMenuNodeFn() !== null) {
      return;
    }
    var tempMenuNode = document.createElement("ul");
    var optionNode;
    var spanNode;
    var i;
    var tempMappingObj;
    var tempTitle;
    var tempName;
    var tempIndex;
    var tempObj;
    var optionText;
    tempMenuNode.id = this.id; 
    tempMenuNode.className = this.class;
    tempMenuNode.setAttribute('data-select', 0);
    tempMenuNode.setAttribute('data-auto-no', autoItemIndexArr.join(","));
    tempMenuNode.style.position = "absolute";//absolute
    tempMenuNode.style.zIndex = 99;
    tempMenuNode.style.top = (this.top + this.height) + 'px';
    tempMenuNode.style.left = this.left + 'px';
    tempMenuNode.style.minWidth = this.width + 'px';

    optionNode = document.createElement("li");
    if (typeof defaultWord === "object" ) {
      tempName = defaultWord.name;
      tempIndex = defaultWord.index;
      tempObj = nodeDataList[tempName].itemObjs[tempIndex];
      optionText = tempObj.text;
      optionNode.setAttribute('data-name', tempName);
      optionNode.setAttribute('data-index', tempIndex);
      optionNode.appendChild(document.createTextNode(optionText));
      if (this.hideTag === false) {
        tempTitle = nodeDataList[tempName].title;
        if (tempTitle !== '' && tempTitle !== undefined) {
          spanNode = document.createElement("span");
          spanNode.className = this.tagClass;
          spanNode.appendChild(document.createTextNode(tempTitle));
          optionNode.appendChild(spanNode);
        }
      }
    } else {
      optionNode.setAttribute('data-name', '');
      optionNode.setAttribute('data-index', '');
      optionNode.appendChild(document.createTextNode(defaultWord));
    }
    if (this.firstItemHideFlag) {
      optionNode.style.display = "none";
    }
    optionNode.className = "focus";
    compatibleJs.addEventListener(optionNode, 'click', clickEvent);
    tempMenuNode.appendChild(optionNode);

    i = 0;
    while (undefined !== (tempMappingObj = keepMappingKey[i++])) {
      tempName = tempMappingObj.name;
      tempIndex = tempMappingObj.index;
      tempObj = nodeDataList[tempName].itemObjs[tempIndex];
      optionNode = document.createElement("li");
      optionNode.setAttribute('data-name', tempName);
      optionNode.setAttribute('data-index', tempIndex);
      if (tempObj instanceof TextObj) {
        optionText = defaultWord;
      } else {

        optionText = tempObj.text;
      }
      optionNode.appendChild(document.createTextNode(optionText));
      if (this.hideTag === false) {
        tempTitle = nodeDataList[tempName].title;
        if (tempTitle !== '' && tempTitle !== undefined) {
          spanNode = document.createElement("span");
          spanNode.className = this.tagClass;
          // spanNode.style.float = "right";
          spanNode.appendChild(document.createTextNode(tempTitle));
          optionNode.appendChild(spanNode);
        }
      }
      compatibleJs.addEventListener(optionNode, 'click', clickEvent);
      // optionNode.addEventListener('click', _clickMenuItem);
      tempMenuNode.appendChild(optionNode);
    }
    this.setMenuNodeFn(tempMenuNode);
  };

  BaseMenu.prototype.createSelectMenuFn = function(defaultWord, autoItemIndexArr, keepMappingKey) {  
    this.setTypeFn('select');
    this.id = "ssj-menu-" + uiRandomNo; 
    this.class = config.menuClass;
    this.hideTag = config.hideTag;
    this.firstItemHideFlag = true;

    this.createBaseMenuFn(defaultWord, autoItemIndexArr, keepMappingKey, this.clickSelectItemEvent);
  };

  BaseMenu.prototype.createMsgMenuFn = function(defaultWord, autoItemIndexArr) {
    this.setTypeFn('msg');
    this.id = "ssj-msg-" + uiRandomNo; 
    this.class = config.msgClass;   
    this.hideTag = true;
    this.firstItemHideFlag = false;

    this.createBaseMenuFn(defaultWord, autoItemIndexArr, [], this.clickMsgItemEvent);
  };

  BaseMenu.prototype.focusMenuItemFn = function() {
    var menuNode = this.getMenuNodeFn();
    if (menuNode === null) {
      return false;
    }
    var focusNode = menuNode.children[+(menuNode.getAttribute('data-select'))];
    if (focusNode.offsetTop < this.scrollTop) {
      var tempScroll = focusNode.offsetTop + focusNode.offsetHeight - this.offsetHeight;
      this.scrollTop = (tempScroll < 0)? 0 : tempScroll;
      return;
    } else if (focusNode.offsetTop + focusNode.offsetHeight > this.scrollTop + this.offsetHeight) {
      this.scrollTop = focusNode.offsetTop;
      return;
    }
  };

  BaseMenu.prototype.createChangeMenuFn = function(defaultObj, autoItemIndexArr, keepMappingKey) {
    this.setTypeFn('change');
    this.id = "ssj-change-" + uiRandomNo; 
    this.class = config.menuClass;
    this.hideTag = config.hideTag;
    this.firstItemHideFlag = false;

    this.createBaseMenuFn(defaultObj, autoItemIndexArr, keepMappingKey, this.clickChangeItemEvent);
  };
  
  BaseMenu.prototype.clickSelectItemEvent = function(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var tempNode = tempEvent.target;
    var tempMenuNode;
    var index;
    var autoItemIndex;
    var tempIndexArr;
    var tempAutoObj;
    var tempName;
    var tempIndex;
    var tempObj;
    if (tempNode.tagName != "LI") {
      if (tempNode.className == config.tagClass && tempNode.parentNode.tagName == "LI") {
        tempNode = tempNode.parentNode;
      } else {
        return;
      }
    }
    tempMenuNode = tempNode.parentNode;
    index = compatibleJs.arrayIndexOf(tempMenuNode.children, tempNode);
    if (index === -1 || index === 0) {
      return;
    } else {
      tempMenuNode.setAttribute('data-select', index);
      tempNode.className = "focus";
    }
    autoItemIndex = tempMenuNode.getAttribute('data-auto-no');
    tempIndexArr = autoItemIndex.split(",");
    tempAutoObj = autoCompleteList[tempIndexArr[0]];
    tempName = tempMenuNode.children[index].getAttribute('data-name');
    tempIndex = +(tempMenuNode.children[index].getAttribute('data-index'));
    tempObj = nodeDataList[tempName].itemObjs[tempIndex];

    if (tempObj instanceof TextObj) {
      tempObj.setTextFn(tempMenuNode.children[0].textContent);
    }
    tempAutoObj.setObjFn(tempObj); //tempObj.usedFlag = true;
    if (tempIndexArr.length > 1) { 
      autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
    }
    _setAutoCompleteWord(tempIndexArr[0]);
    menuObj.removeMenuNodeFn();
  
    autoNode.focus();
    _checkAutoComplete(tempIndexArr[0]-1);
    tempEvent.preventDefault(); //停止冒泡事件
  };

  BaseMenu.prototype.clickChangeItemEvent = function(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var tempNode = tempEvent.target;
    var tempMenuNode;
    var index;
    var autoItemIndex;
    var tempIndexArr;
    var tempAutoObj;
    var tempName;
    var tempIndex;
    var tempObj;
    if (tempNode.tagName != "LI") {
      if (tempNode.className == config.tagClass && tempNode.parentNode.tagName == "LI") {
        tempNode = tempNode.parentNode;
      } else {
        return;
      }
    }
    tempMenuNode = tempNode.parentNode;
    index = compatibleJs.arrayIndexOf(tempMenuNode.children, tempNode);
    if (index === -1) {
      return;
    } else if (index === 0) {

    } else {
      tempMenuNode.setAttribute('data-select', index);
      tempNode.className = "focus";
      autoItemIndex = tempMenuNode.getAttribute('data-auto-no');
      tempIndexArr = autoItemIndex.split(",");
      tempAutoObj = autoCompleteList[tempIndexArr[0]];
      tempName = tempMenuNode.children[index].getAttribute('data-name');
      tempIndex = +(tempMenuNode.children[index].getAttribute('data-index'));
      tempObj = nodeDataList[tempName].itemObjs[tempIndex];
      tempAutoObj.setObjFn(tempObj); //tempObj.usedFlag = true;

      if (tempIndexArr.length > 1) {
        autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
      }
      _setAutoCompleteWord(tempIndexArr[0]);
    }
    menuObj.removeMenuNodeFn();
  
    autoNode.focus();
    _checkAutoComplete();
    tempEvent.preventDefault(); //停止冒泡事件
  };

  BaseMenu.prototype.clickMsgItemEvent = function(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var tempNode = tempEvent.target;
    var tempMenuNode = tempNode.parentNode;
    var autoItemIndex = tempMenuNode.getAttribute('data-auto-no');
    var tempIndexArr = autoItemIndex.split(",");
    autoNode.focus();
    _removeInvalidWord(e, tempIndexArr[0] - 1);
    tempEvent.preventDefault(); //停止冒泡事件
  };

  BaseMenu.prototype.controlBaseEvent = function(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    var menuNode = menuObj.getMenuNodeFn();
    if (menuNode === null) {
      return;
    }
    if (menuObj.getTypeFn() === 'msg') {
      menuObj.controlMsgEvent(e);
      return true;
    }
    var tempFocusItem = +(menuNode.getAttribute('data-select'));

    if (tempFocusItem === null) {
      tempFocusItem = 0;
    }
    switch (e.keyCode) {
      case constKeyCode.ESC: 
        menuObj.removeMenuNodeFn();  
        break;
      case constKeyCode.UP: 
        menuNode.children[tempFocusItem].className = "";
        tempFocusItem--;
        if (tempFocusItem < 0) {
          tempFocusItem = menuNode.childElementCount-1;
        }
        menuNode.children[tempFocusItem].className = "focus";
        menuNode.setAttribute('data-select', tempFocusItem);
        menuObj.focusMenuItemFn();
        break;
      case constKeyCode.DOWN:
        menuNode.children[tempFocusItem].className = "";
        tempFocusItem++;
        if (tempFocusItem > menuNode.childElementCount-1) {
          tempFocusItem = 0;
        }
        menuNode.children[tempFocusItem].className = "focus";
        menuNode.setAttribute('data-select', tempFocusItem);
        menuObj.focusMenuItemFn();
        break;
      case constKeyCode.TAB:
        if (menuObj.getTypeFn() === 'select') {
          if (tempFocusItem === 0) {
            tempFocusItem = 1;
            menuNode.children[tempFocusItem].className = "focus";
            menuNode.setAttribute('data-select', tempFocusItem);
          }
        }
        //no break; //故意觸發 ENTER 動作
      case constKeyCode.ENTER: //enter
        if (menuObj.getTypeFn() === 'select') {
          menuObj.controlSelectEnterFn();
        } else if (menuObj.getTypeFn() === 'change') {
          menuObj.controlChangeEnterFn();
        } else {
          compatibleJs._warning('unknow BaseMenu.type');
        }
        tempEvent.preventDefault(); //停止冒泡事件
        break;
    }
  };

  BaseMenu.prototype.controlSelectEnterFn = function() {
    var menuNode = menuObj.getMenuNodeFn();
    var tempFocusItem = +(menuNode.getAttribute('data-select'));
    var autoItemIndex;
    var tempIndexArr;
    var tempAutoObj;
    var tempName;
    var tempIndex;
    var tempObj;
    if (tempFocusItem === null) {
      tempFocusItem = 0;
    }
    
    autoItemIndex = menuNode.getAttribute('data-auto-no');
    tempIndexArr = autoItemIndex.split(",");
    tempAutoObj = autoCompleteList[tempIndexArr[0]];
    if (menuNode.childElementCount == 2) { //若只有一個選項，按下ENTER等同按下TAB
      tempFocusItem = 1;
    }
    if (tempFocusItem === 0) {
      _setAutoCompleteWord(tempIndexArr[tempIndexArr.length - 1]);
    } else {
      tempName = menuNode.children[tempFocusItem].getAttribute('data-name');
      tempIndex = menuNode.children[tempFocusItem].getAttribute('data-index');
      tempObj = nodeDataList[tempName].itemObjs[tempIndex];

      if (tempObj instanceof TextObj) {
        tempObj.setTextFn(menuNode.children[0].textContent);
      }
      tempAutoObj.setObjFn(tempObj); //tempObj.usedFlag = true;

      if (tempIndexArr.length > 1) {
        autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
      }
      _setAutoCompleteWord(tempIndexArr[0]);
    }
    menuObj.removeMenuNodeFn();
    _checkAutoComplete(tempIndexArr[0]-1);
  };

  BaseMenu.prototype.controlChangeEnterFn = function() {
    var menuNode = menuObj.getMenuNodeFn();
    var tempFocusItem = +(menuNode.getAttribute('data-select'));
    var autoItemIndex;
    var tempIndexArr;
    var tempAutoObj;
    var tempName;
    var tempIndex;
    var tempObj;
    if (tempFocusItem === null) {
      tempFocusItem = 0;
    }
    if (tempFocusItem === 0) {
      menuObj.removeMenuNodeFn();
    } else {
      autoItemIndex = menuNode.getAttribute('data-auto-no');
      tempIndexArr = autoItemIndex.split(",");
      tempAutoObj = autoCompleteList[tempIndexArr[0]];
      tempName = menuNode.children[tempFocusItem].getAttribute('data-name');
      tempIndex = +(menuNode.children[tempFocusItem].getAttribute('data-index'));
      tempObj = nodeDataList[tempName].itemObjs[tempIndex];
      tempAutoObj.setObjFn(tempObj); //tempObj.usedFlag = true;

      if (tempIndexArr.length > 1) {
        autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
      }
      _setAutoCompleteWord(tempIndexArr[0]);
    }
    menuObj.removeMenuNodeFn();
    _checkAutoComplete();
  };

  BaseMenu.prototype.controlMsgEvent = function(e) {
    var tempEvent = compatibleJs.eventCompatible(e);
    if(e.keyCode === constKeyCode.ESC || 
      e.keyCode === constKeyCode.TAB || 
      e.keyCode === constKeyCode.ENTER
      ) {
      var autoItemIndex = menuObj.getMenuNodeFn().getAttribute('data-auto-no');
      var tempIndexArr = autoItemIndex.split(",");

      _removeInvalidWord(e, tempIndexArr[0] - 1);
      tempEvent.preventDefault(); //停止冒泡事件
    } 
  };
  
  return returnParam;
}
