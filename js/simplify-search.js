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
    "tagClass": param.tagClass || "ssj-tag",
    "usePlaceholder": (param.usePlaceholder !== undefined)? !!param.usePlaceholder : true, 
  };
  var notMappingWords = "";
  var wordsList = [];
  var mappingList = [];
  var regExpList = [];
  var autoCompleteList = [];
  var formNode = document.getElementById(config.formId);
  var autoNode = null;
  var menuNode = null;
  var configRegExpList = []; //dom 可能會重複，若重複則使用最後一次的設定
  var configIgnoreList = [];
  var configTitleList = {};
  var keyinPosition = 0;
  // var keepSelectFlag = false;
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
  var constRegexp = {
    "ANY": /.+/,
    "NUMBER": /\d+/,
  };
  var saveInputType = ["text","radio","checkbox","url","email","tel","date","number"];
  var constTagType = {
    "NOALLOW": 0,
    "INPUT_TEXT": 1,
    "INPUT_RADIO": 2,
    "INPUT_CHECKBOX": 3,
    "INPUT_URL": 4,
    "INPUT_EMAIL": 5,
    "INPUT_TEL": 6,
    "INPUT_DATE": 7,
    "INPUT_NUMBER": 8,
    "TEXTAREA": 9,
    "SELECT_ONE": 10, 
    "SELECT_MULTIPLE": 11,
  }
  //return 回傳的變數
  var returnParam = {
    "init": init,
    "addData": addDomDataMapping, 
    "addRegexpByDom": addRegexpByDom,
    "addRegexpById": addRegexpById,
    "addIgnoreByDom": addIgnoreByDom,
    "addIgnoreById": addIgnoreById,
    "setTitleByName": setTitleByName,
    "setTextCanMultipleByDom": setTextCanMultipleByDom,
    "setTextCanMultipleById": setTextCanMultipleById,
  };

  if (config.debugMode) {
    returnParam.log = logParam;
  }

  function init() {
    var tempAutoDomNode;
    var temp;
    var tempNode;
    if (formNode === null) {
      throw "not find form (id = " + config.formId + ")";
      return ;
    }
    
    autoNode = document.getElementById(config.autoFeildId);
    //當 id 不存在時要自動新增
    if (autoNode === null) {
      tempAutoDomNode = document.createElement('input');
      tempAutoDomNode.id = config.autoFeildId;
      tempAutoDomNode.type = "input";
      tempAutoDomNode.className = config.autoFeildClass;
      formNode.parentNode.insertBefore(tempAutoDomNode,formNode);
      autoNode = tempAutoDomNode;
    }
    if (config.hideForm == true) {
      formNode.style.display = 'none';
    }

    //分析表單內的資料
    temp = 0;
    while (tempNode = formNode[temp++]) {
      //TODO DISABLEED / READONLY
      if (tempNode.getAttribute('data-ignore-flag') !== null) {
        continue;
      }
      if (tempNode === autoNode) {
        continue;
      }
      var tagType = _getCustomTagType(tempNode);
      if (tagType === constTagType.NOALLOW) {
        continue;
      }
      switch (tagType) {
        case constTagType.INPUT_NUMBER:
        case constTagType.INPUT_DATE:
        case constTagType.INPUT_EMAIL:
        case constTagType.INPUT_TEL:
        case constTagType.INPUT_URL:
        case constTagType.TEXTAREA:
        case constTagType.INPUT_TEXT:
          _addRegExpList(new TextObj(tempNode));
          break;
        case constTagType.INPUT_RADIO:
        case constTagType.INPUT_CHECKBOX:
          _addWordsList(new CheckObj(tempNode));
          break;
        case constTagType.SELECT_ONE:
        case constTagType.SELECT_MULTIPLE:
          _analysisSelect(tempNode);
          break;
      }
    }

    //綁定autoComplete事件
    _addEventListener(autoNode, "keydown", _keyDownEventAction); //抓到游標原始位置
    _addEventListener(autoNode, "keydown", _controlSelectMenu); //控制autoComplete選單
    _addEventListener(autoNode, "keyup", _checkWordChange); //輸入法異動只會觸發up事件
    _addEventListener(document, "click",_checkIfBlurAutoComplete);
    _addEventListener(autoNode, "click", _clickInputEventAction);


    return returnParam;
  }
  function addDomDataMapping(inNode, valueToTextJson) {
    return returnParam;
  }
  function addRegexpById(id, inRegexp) {
    var tempNode = document.getElementById(id);
    if(tempNode === undefined || tempNode === null){
      _warning('function addRegexpById : getElementById("' + id + '") no exist');
      return returnParam;
    }
    return addRegexpByDom(tempNode, inRegexp);
  }
  function addRegexpByDom(inNode, inRegexp) {
    if (!(inNode instanceof Element)) {
      throw "param not HTML DOM Nodes";
      return returnParam;
    }
    if (!(inRegexp instanceof RegExp)) {
      throw "param not RegExp object";
      return returnParam;
    }
    _addRegexpDom(inNode, inRegexp);
    return returnParam;
  }
  function addIgnoreById(id) {
    var tempNode = document.getElementById(id);
    if(tempNode === undefined || tempNode === null){
      _warning('function addIgnoreById : getElementById("' + id + '") no exist');
      return returnParam;
    }
    return addIgnoreByDom(tempNode);
  }
  function addIgnoreByDom(inNode) {
    if (!(inNode instanceof Element)) {
      throw "param not HTML DOM Nodes";
      return returnParam;
    }
    _addIgnoreNode(inNode);
    return returnParam;
  }
  function setTitleByName(inName, inTitle) {
    var tempName = inName.replace(/\[.*\]/g, ""); //消除[]
    if (formNode[tempName] === undefined) { 
      _warning('[name="'+inName+'"] not exist');
      return returnParam;
    }
    configTitleList[tempName] = inTitle;
    return returnParam;
  }
  function setTextCanMultipleById(id) {
    var tempNode = document.getElementById(id);
    if(tempNode === undefined || tempNode === null){
      _warning('function setTextCanMultipleById : getElementById("' + id + '") no exist');
      return returnParam;
    }
    return setTextCanMultipleByDom(tempNode);
  }
  function setTextCanMultipleByDom(textNode) {
    var custemTagType;
    if(textNode === undefined || textNode === null){
      _warning("function setTextCanMultipleByDom param is undefined");
      return returnParam;
    }
    custemTagType = _getCustomTagType(textNode);
    if(custemTagType === constTagType.INPUT_TEXT || custemTagType === constTagType.TEXTAREA) {
      textNode.setAttribute('data-ssj-multiple',true);
    } else {
      _warning("function setTextCanMultiple param not allow <"+ textNode.tagName.toLowerCase() +"> object");
    }
    return returnParam;
  }
  function logParam() {
    return {
      "config": config,
      "wordsList": wordsList,
      "mappingList": mappingList,
      "regExpList": regExpList,
      "configIgnoreList": configIgnoreList,
      "autoCompleteList": autoCompleteList,
      "configTitleList": configTitleList,
      "autoNode": autoNode,
      "menuNode": menuNode,
      "formNode": formNode,
    };
  }
  //analysis data ----------------------------------------
  function _getLabelTitle(domNode) {
    var customTagType = _getCustomTagType(domNode);
    var tempTitle = "";
    var tempName;
    //不能沒有 name ，若用 id 抓取可能會造成同樣的 name 對應不同的 title
    if (domNode.name == undefined) {
      return "";
    }
    tempName = domNode.name.replace(/\[.*\]/g, ""); //消除[]
    //若已經設定就用設定的值
    if (configTitleList[tempName] !== undefined) {
      return configTitleList[tempName];
    }
    //若為 radio / checkbox 就不使用 label 作為 title 的依據
    if (customTagType !== constTagType.INPUT_RADIO && customTagType !== constTagType.INPUT_CHECKBOX) {
      tempTitle = _analysisMappingLabel(domNode, formNode);
      if(
        config.usePlaceholder 
        && tempTitle == ""  
        && (customTagType === constTagType.INPUT_TEXT 
          || customTagType === constTagType.TEXTAREA ) 
        && domNode.getAttribute("placeholder")
      ) {
        tempTitle = domNode.getAttribute("placeholder").trim();
      }
    }
    if ( tempTitle === "" ) {
      tempTitle = tempName; //若沒有指定就直接抓 node.name
    }
    configTitleList[tempName] = tempTitle;
    return tempTitle;
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
    var tempLabelArr = _getElementsByAttribute('for', domNode.id, 'label', parentNode);
    if (tempLabelArr.length != 1) {
      return ""; //多個 label 就不設定
    } else {
      tempName = tempLabelArr[0].textContent.trim();
      return tempName;
    }
  }
  function _analysisSelect(domNode)
  {
    //TODO 複選
    if (domNode.length == 1) {
      return;
    }
    for (var temp = 0; temp < domNode.length; temp++) {
      if (config.ignoreEmptyValue === true && domNode[temp].value == '') {
        continue;
      }
      if (domNode[temp].tagName == "OPTION") { //排除 <optgroup>
        _addWordsList(new OptionObj(temp, domNode));
      }
    }
  }

  function _getCustomTagType(domNode) {
    var tempType = undefined;
    if (domNode == undefined || domNode == null) {
      return constTagType.NOALLOW;
    }
    switch(domNode.tagName){
      case "SELECT":
        if (domNode.getAttribute('multiple')) {
          return constTagType.SELECT_MULTIPLE;
        } else {
          return constTagType.SELECT_ONE;
        }
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
        } else if (tempType == "email") {
          return constTagType.INPUT_EMAIL;
        } else if (tempType == "tel") {
          return constTagType.INPUT_TEL;
        } else if (tempType == "url") {
          return constTagType.INPUT_URL;
        }
        return constTagType.NOALLOW;
      case "TEXTAREA":
        return constTagType.TEXTAREA;
      default:
        return constTagType.NOALLOW
    }
    
  }
  function _addIgnoreNode(domNode) {
    var typeFlag;
    var type;
    var temp;
    
    switch(domNode.tagName){
      case "SELECT":
        typeFlag = 1;
        break;
      case "INPUT":
        type = domNode.type;
        if (type !== undefined) {
          type = type.toLowerCase();
          if (_arrayIndexOf(saveInputType, type) == -1) {
            return false;
          }
        }
        if (type == "radio" || type == "checkbox") {
          typeFlag = 1;
        } else { //包含 undefined
          typeFlag = 2;
        }
        break;
      case "TEXTAREA":
        typeFlag = 2;
        break;
      
    }
    if (typeFlag == 1) { //mappingList
      for (temp = 0; temp < mappingList.length; temp++) {
        if (mappingList[temp].node === domNode) {
          mappingList.splice(temp,1);
          wordsList.splice(temp,1);
          //一對多，因此不可以下 break
        }
      }
    } else if (typeFlag == 2) { //regExpList
      for (temp = 0; temp < regExpList.length; temp++) {
        if (regExpList[temp].node === domNode) {
          regExpList.splice(temp,1);
          break;
        }
      }
    } else {
      return false;
    }
    if (_arrayIndexOf(configIgnoreList,domNode)== -1) {
      domNode.setAttribute('data-ignore-flag',configIgnoreList.length);
      configIgnoreList.push(domNode);
    }
    return true;

  }

  function _addRegexpDom(domNode,regexp) {
    var type;
    var temp;

    if (domNode.tagName != "INPUT" && domNode.tagName != "TEXTAREA") {
      return false;
    } else if (domNode.tagName == "INPUT") {
      type = domNode.type;
      if (type !== undefined) {
        type = type.toLowerCase();
        if (_arrayIndexOf(saveInputType, type) == -1) {
          return false;
        }
      }
      if (type == "radio" || type == "checkbox") {
        return false;
      }
    }

    for (temp = 0; temp < regExpList.length; temp++) {
      if (regExpList[temp].node === domNode) {
        regExpList[temp].setRegexpFn(regexp);
        break;
      }
    }
    domNode.setAttribute('data-regexp-flag',configRegExpList.length);
    configRegExpList.push({"node": domNode, "regexp": regexp}); //不處理重複，以最後設定為主
    return true;
  }

  function _addWordsList(itemObj) {
    if (wordsList.length != mappingList.length) {
      throw "simplify-search-js: ooops.... data analysis error";
      return; //異常
    }
    wordsList.push(itemObj.text);
    mappingList.push(itemObj);
  }

  function _addRegExpList(itemObj) {
    regExpList.push(itemObj);
  }

  //keyin & menu event control --------------------------
  
  function _keyDownEventAction(e) {
    keyinPosition = _getKeyinPosition(autoNode);
    // console.log("position:" + keyinPosition);
  }

  function _clickInputEventAction(e) {
    _keyDownEventAction(e)
    if (menuNode === null) {
      var tempSlice = autoNode.value.slice(0,keyinPosition).split(" ");
      //TODO FIX BUG
      _selectAutoComplete(tempSlice.length-1);
    }
  }

  function _checkIfBlurAutoComplete(e) {
    if (document.activeElement != menuNode && document.activeElement != autoNode) {
       _removeInvalidWord(e);
    }
  }

  function _checkWordChange(e) {
    var inputText = autoNode.value.trim();
    // var textArr = inputText.split(" ");
    var tempList = [];
    //var tempKey = 0;
    //var tempOriList = _getAutoCompleteWordsArr();
    var diffFlag = false;
    var tempWIndex;
    var tempWEnd;
    var tempWord;
    var newAutoObj;
    //var tempFlag;
    if (inputText == "") { //清空輸入框
      diffFlag = true;
    } else {
      //文字片段可能會涵蓋空白，因此必須先判斷已選的文字，切割判斷完後再判斷剩下的
      inputText = " " + inputText + " ";
      for (var temp = 0; temp < autoCompleteList.length; temp++) {
        if (autoCompleteList[temp] === undefined) {
          continue;
        }
        tempWord = " " + autoCompleteList[temp].getTextFn() + " ";
        tempWIndex = inputText.indexOf(tempWord);
        if (tempWIndex !== -1) {
          inputText = inputText.replace(tempWord, new Array(tempWord.length).join(" ")); //only replace first word
          autoCompleteList[temp].sort = tempWIndex;
          tempList.push(autoCompleteList[temp]);
        } else {
          diffFlag = true;
        }
      }
      //剩下的文字就是新增的資料
      if (inputText.trim() !== "") {
        diffFlag = true;
        tempWIndex = inputText.search(/\S/i);
        tempWEnd = inputText.indexOf(" ",tempWIndex);
        tempWord = inputText.substring(tempWIndex,tempWEnd);
        inputText = inputText.replace(tempWord, new Array(tempWord.length).join(" ")); //only replace first word
        newAutoObj = new autoCompleteItemObj(tempWord);
        newAutoObj.sort = tempWIndex;
        tempList.push(newAutoObj);
      }
      tempList.sort(function(a, b) {
        return a.sort - b.sort;
      }); 
    }
    
    //END
    if (diffFlag) {
      //清空表單選擇
      _resetForm();
      _removeMenuBox();
      autoCompleteList = tempList;
      _checkAutoComplete();
    } else {
      switch(e.keyCode) {
        case constKeyCode.SPACE:
          _removeInvalidWord(e,'onlyRepeat');
          break;
        case constKeyCode.DOWN:
          if (menuNode === null) { 
            //取得目前的位置
            var tempSlice = autoNode.value.slice(0,keyinPosition).split(" ");
            // autoComplete(autoNode.value.split(" ")[tempSlice.length-1]);
            // TODO FIX BUG
            _selectAutoComplete(tempSlice.length - 1, true);
            
          }
      }
    }
  }
  
  function _controlSelectMenu(e) {
    if (menuNode === null) {
      return false;
    }
    var tempFocusItem = menuNode.getAttribute('data-select');
    
    switch(e.keyCode) {
      case constKeyCode.ESC: //esc
        _removeMenuBox();
        notMappingWords = "";
        break;
      case constKeyCode.UP: //up
        menuNode.children[tempFocusItem].className = "";
        tempFocusItem--;
        if (tempFocusItem < 0) {
          tempFocusItem = menuNode.childElementCount-1;
        }
        menuNode.children[tempFocusItem].className = "focus";
        menuNode.setAttribute('data-select', tempFocusItem);
        _focusMenuItem();
        break;
      case constKeyCode.DOWN: //down
        menuNode.children[tempFocusItem].className = "";
        tempFocusItem++;
        if (tempFocusItem > menuNode.childElementCount-1) {
          tempFocusItem = 0;
        }
        menuNode.children[tempFocusItem].className = "focus";
        menuNode.setAttribute('data-select', tempFocusItem);
        _focusMenuItem();
        break;
      case constKeyCode.TAB:
        if (tempFocusItem == 0) {
          tempFocusItem = 1;
        }
        //break; //故意觸發 ENTER 動作
      case constKeyCode.ENTER: //enter
        var autoItemIndex = menuNode.getAttribute('data-auto-no');
        var tempAutoObj = autoCompleteList[autoItemIndex];
        // if (tempFocusItem == 0) {
        //   tempAutoObj.removeObjFn();
        // } else {
          var tempTypeArr = menuNode.children[tempFocusItem].getAttribute('data-value').split("-");
          if (tempTypeArr[0] == "S") {
            tempAutoObj.setObjFn(mappingList[tempTypeArr[1]]);
          } else if (tempTypeArr[0] == "K") {
            var tempItemObj = regExpList[tempTypeArr[1]];
            tempItemObj.setTextFn(menuNode.children[0].textContent);
            tempAutoObj.setObjFn(tempItemObj);          
          }
        //}

        var word = menuNode.children[0].textContent;
        var tempWordsPart = word.split(" ").length;
        var temp = autoItemIndex;
        while ( --tempWordsPart > 0) {
          autoCompleteList[--temp] = undefined;
        }
        _setAutoCompleteWord(autoItemIndex);
        _removeMenuBox();
        _checkAutoComplete();
        e.preventDefault(); //停止冒泡事件
        break;
    }
  }

  function _createMenuBox(defaultWord,wordsKeyList,regexpKeyList,autoItemIndex) {
    
    // if (keepSelectFlag === true) {
    //   return;
    // }
    var selectNode = document.createElement("ul");
    var height = autoNode.offsetHeight || autoNode.clientHeight; 
    var width = autoNode.offsetWidth || autoNode.clientWidth;
    var top = autoNode.offsetTop || autoNode.clientTop; 
    var left = autoNode.offsetLeft || autoNode.clientLeft;
    var optionNode;
    var divNode;
    var temp;
    var tempKey;
    var tempTitle;
    selectNode.id = "ssj-menu-" + uiRandomNo; 
    selectNode.className = config.menuClass;
    selectNode.setAttribute('data-select',0);
    selectNode.setAttribute('data-auto-no',autoItemIndex);
    selectNode.style.position = "absolute";//absolute
    selectNode.style.top = (top + height) + 'px';
    selectNode.style.left = left + 'px';
    selectNode.style.minWidth = width + 'px';

    optionNode = document.createElement("li");
    optionNode.setAttribute('data-value','');
    optionNode.appendChild(document.createTextNode(defaultWord));

    optionNode.style.display = "none";
    optionNode.className = "focus";
    selectNode.appendChild(optionNode);

    temp = 0;
    while ((tempKey = regexpKeyList[temp++]) !== undefined) {
      optionNode = document.createElement("li");
      optionNode.setAttribute('data-value', "K-" + tempKey);
      optionNode.appendChild(document.createTextNode(defaultWord));
      
      if (config.hideTag === false) {
        tempTitle = regExpList[tempKey].getTagFn();
        if (tempTitle !== '' && tempTitle !== undefined) {
          divNode = document.createElement("span");
          divNode.className = config.tagClass;
          // divNode.style.float = "right";
          divNode.appendChild(document.createTextNode(tempTitle));
          optionNode.appendChild(divNode);
        }
      }
      optionNode.addEventListener('click', _clickMenuItem);
      selectNode.appendChild(optionNode);
    }
    temp = 0;
    while ((tempKey = wordsKeyList[temp++]) !== undefined) {
      optionNode = document.createElement("li");
      optionNode.setAttribute('data-value', "S-" + tempKey);
      optionNode.appendChild(document.createTextNode(wordsList[tempKey]));
      
      if (config.hideTag === false) {
        tempTitle = mappingList[tempKey].getTagFn();
        if (tempTitle !== '' && tempTitle !== undefined) {
          divNode = document.createElement("span");
          divNode.className = config.tagClass;
          // divNode.style.float = "right";
          divNode.appendChild(document.createTextNode(tempTitle));
          optionNode.appendChild(divNode);
        }
      }
      optionNode.addEventListener('click',_clickMenuItem);
      selectNode.appendChild(optionNode);
    }
    if (menuNode !== null) {
      menuNode.remove();
      menuNode = null;
      // autoNode.parentNode.replaceChild(selectNode,menuNode);
    } 
    autoNode.parentNode.appendChild(selectNode);
    menuNode = selectNode;
    // console.log(menuNode);
    
  }

  function _clickMenuItem(e) {
    var tempNode = e.target;
    if (tempNode.tagName != "LI") {
      if(tempNode.className == config.tagClass && tempNode.parentNode.tagName == "LI") {
        tempNode = tempNode.parentNode;
      } else {
        return;
      }
    }
    var index = _arrayIndexOf(menuNode.children,tempNode);
    if (index == -1 || index == 0) {
      return;
    } else {
      menuNode.setAttribute('data-select',index);
      tempNode.className = "focus";
    }
    var autoItemIndex = menuNode.getAttribute('data-auto-no');
    var tempAutoObj = autoCompleteList[autoItemIndex];
    var tempTypeArr = menuNode.children[index].getAttribute('data-value').split("-");
    if (tempTypeArr[0] == "S") {
      tempAutoObj.setObjFn(mappingList[tempTypeArr[1]]);
    } else if (tempTypeArr[0] == "K"){
      var tempItemObj = regExpList[tempTypeArr[1]];
      tempItemObj.setTextFn(menuNode.children[0].textContent);
      tempAutoObj.setObjFn(tempItemObj);
    }
    var word = menuNode.children[0].textContent;
    var tempWordsPart = word.split(" ").length;
    var temp = autoItemIndex;
    while ( --tempWordsPart > 0) {
      autoCompleteList[--temp] = undefined;
    }
    _setAutoCompleteWord(autoItemIndex);
    _removeMenuBox();
    autoNode.focus();
    _checkAutoComplete();
    e.preventDefault(); //停止冒泡事件
  }

  function _focusMenuItem() {
    if (menuNode === null) {
      return false;
    }
    var focusNode = menuNode.children[menuNode.getAttribute('data-select')];
    if (focusNode.offsetTop < menuNode.scrollTop) {
      var tempScroll = focusNode.offsetTop + focusNode.offsetHeight - menuNode.offsetHeight;
      menuNode.scrollTop = (tempScroll < 0)? 0 : tempScroll;
      return;
    } else if (focusNode.offsetTop + focusNode.offsetHeight > menuNode.scrollTop + menuNode.offsetHeight) {
      menuNode.scrollTop = focusNode.offsetTop;
      return;
    }
  }

  function _removeMenuBox() {
    if (menuNode !== null) {
      menuNode.remove();
      menuNode = null;
      // keepSelectFlag = false;
    }
  }

  function _checkAutoComplete() {
    notMappingWords = "";
    for (var temp = 0; temp < autoCompleteList.length; temp++) {
      if (autoCompleteList === undefined) {
        continue;
      }
      _selectAutoComplete(temp);
      // if (_selectAutoComplete(temp)) {
      //   keepSelectFlag = true;
      // }
    }
    // while (temp--){
    //   if (autoCompleteList[temp] === undefined){
    //     autoCompleteList.splice(temp,1);
    //   }
    // }
    // console.log(autoCompleteList);
  }

  function _selectAutoComplete(autoObjIndex,resetFlag) {
    var tempAutoObj = autoCompleteList[autoObjIndex];
    if (tempAutoObj === undefined) {
      return false;
    }
    if (tempAutoObj.getObjFn() !== undefined && resetFlag !== true) {
      tempAutoObj.getObjFn().activeFn();
      return false;
    }
    var word = tempAutoObj.getTextFn();
    if (notMappingWords != "") {
      word = notMappingWords + " " + word;
    }
    var keepSelectKey = [];
    var keepRegexpKey = [];
    var temp;
    for (temp = 0; temp < wordsList.length; temp++) {
      if (wordsList[temp].toLowerCase().indexOf(word.valueOf().toLowerCase()) !== -1) {
        keepSelectKey.push(temp);
      }
    }
    for (temp = 0; temp < regExpList.length; temp++) {
      if (regExpList[temp].regexp.test(word) === true) {
        keepRegexpKey.push(temp);
      }
    }
    if (
        keepSelectKey.length === 1 
        && keepRegexpKey.length === 0 
        && wordsList[keepSelectKey[0]] === word
      ) {
      tempAutoObj.setObjFn(mappingList[keepSelectKey[0]]);
      var tempWordsPart = word.split(" ").length;
      while ( --tempWordsPart > 0) {
        autoCompleteList[--autoObjIndex] = undefined;
      }
      notMappingWords = "";
      return false;
    } else if (
        keepSelectKey.length === 0 
        && keepRegexpKey.length === 1 
      ) {
      tempAutoObj.setObjFn(regExpList[keepRegexpKey[0]]);
      var tempWordsPart = word.split(" ").length;
      while ( --tempWordsPart > 0) {
        autoCompleteList[--autoObjIndex] = undefined;
      }
      notMappingWords = "";
      return false;
    } else if (
        keepSelectKey.length === 0
        && keepRegexpKey.length === 0 
      ) {
      _removeMenuBox();
      notMappingWords = word;
      //TODO regExpList
      return false;
    } else {
      notMappingWords = word;
      //TODO regExpList
      _createMenuBox(word,keepSelectKey,keepRegexpKey,autoObjIndex);
      return true;
    }
  }
  
  function _getAutoCompleteWordsArr() {
    var list = [];
    for (var temp = 0; temp < autoCompleteList.length; temp++) {
      if (autoCompleteList[temp] === undefined) {
        continue;
      }
      list.push(autoCompleteList[temp].getTextFn());
    }
    return list;
  }

  function _setAutoCompleteWord(autoItemIndex){
    var list1 = _getAutoCompleteWordsArr();
    if (autoItemIndex !== undefined && autoItemIndex+1 < autoCompleteList.length) {
      var list2 = list1.splice(0,autoItemIndex+1);
      var text1 = list1.join(" ");
      var text2 = list2.join(" ");
      autoNode.value = text2 + " " + text1;
      _setKeyinPosition(autoNode, text2.length);
    } else {
      autoNode.value = list1.join(" ");
    }
    
  }

  //removeType=onlyRepeat或undefined
  function _removeInvalidWord(e,removeType) {
    var nameList = [];
    var tempObj;
    var newAutoComleteList = [];
    for (var temp = autoCompleteList.length-1; temp >=0; temp--) {
      tempObj = autoCompleteList[temp].getObjFn();
      if (tempObj !== undefined) {
        if (tempObj.name.indexOf("[]") != -1 || _arrayIndexOf(nameList,tempObj.name) == -1) {
          nameList.push(tempObj.name);
          newAutoComleteList.push(autoCompleteList[temp]);
        } 
      } else if (removeType == 'onlyRepeat') {
        newAutoComleteList.push(autoCompleteList[temp]);
      }
    }
    if (autoCompleteList.length != newAutoComleteList.length) {
      autoCompleteList = newAutoComleteList;
      _setAutoCompleteWord();
    }
    if (removeType != 'onlyRepeat'){
      _removeMenuBox();
    }
  }

  function _resetForm() {
    //TODO
    formNode.reset();
  }
  
  //Object class ----------------------------------
  
  function autoCompleteItemObj(inText){
    var text = inText;
    var custemObj; //TextObj,OptionObj,CheckObj...
    this.sort = 0;
    
    this.setObjFn = function(inObj){
      if (!(inObj instanceof TextObj) && inObj.text !== undefined && inObj.text != text) {
        text = inObj.text;
        _setAutoCompleteWord();
      } else if (inObj instanceof TextObj ) { 
        // inObj.setTextFn(text); //TextObj.setTextFn()
        text = inObj.text;
        _setAutoCompleteWord();
      }
      custemObj = inObj;
      custemObj.activeFn();
    };
    this.getObjFn = function (){
      return custemObj;
    };
    this.getTextFn = function(){
      return text;
    };
    this.removeObjFn = function(){
      if (custemObj === undefined) {
        return;
      }
      custemObj.cancelFn();
      custemObj = undefined;
    };
  }
  //TextObj, OptionObj, CheckObj 共用 prototype
  function _getItemObjTitleTagFn() {
    if ((this instanceof TextObj || this instanceof OptionObj || this instanceof CheckObj) && this.node !== undefined) {
      return _getLabelTitle(this.node);
    } else {
      return "";
    }
  }

  //TextObj class
  function TextObj(inputDomNode) {
    var regexpIndex = inputDomNode.getAttribute('data-regexp-flag');
    var multipleFlag = inputDomNode.getAttribute('data-ssj-multiple');
    //TODO 增加判斷 maxlength 屬性
    this.node = inputDomNode;
    this.regexp = undefined;
    this.multiple = (multipleFlag !== null)? true : false;
    this.name = inputDomNode.name.replace(/\[.*\]/g, ""); //消除[]
    //inputDomNode.getAttribute('data-regexp')
    if (regexpIndex !== null) {
      if (configRegExpList[regexpIndex] !== undefined && configRegExpList[regexpIndex].node === inputDomNode) {
        this.regexp = configRegExpList[regexpIndex].regexp;
      } else {
        //異常，可能是被改資料，進入容錯處理
        for (var temp = configRegExpList.length - 1; temp >= 0; temp++) {
          if (configRegExpList[temp].node === inputDomNode) {
            this.regexp = configRegExpList[temp].regexp;
            break;
          }
        }
      }
    }
    if (this.regexp === undefined) {
      this.regexp =  constRegexp.ANY;
    }
    //placeholder
    
  }
  //TextObj class prototype
  TextObj.prototype.activeFn = function () {
    this.node.value = this.text;
  };
  TextObj.prototype.cancelFn = function () {
    this.node.value = "";
  };
  TextObj.prototype.setTextFn = function (text) {
    this.text = text;
  };
  TextObj.prototype.setRegexpFn = function (regexp) {
    this.regexp = regexp;
  }
  TextObj.prototype.getTagFn = _getItemObjTitleTagFn;

  //OptionObj class
  function OptionObj(index,selectDomNode) {
    this.node = selectDomNode;
    this.name = selectDomNode.name.replace(/\[.*\]/g, ""); //消除[]
    this.selectedIndex = index;
    this.value =  selectDomNode[index].value;
    this.name = selectDomNode.name;
    this.text = selectDomNode[index].text;
    this.multiple = (selectDomNode.getAttribute('multiple') !== null)? true : false;
  }
  //OptionObj class prototype
  OptionObj.prototype.activeFn = function () {
    this.node[this.selectedIndex].selected = true;
    //this.node.selectedIndex = this.selectedIndex;
  };
  OptionObj.prototype.cancelFn = function () {
    this.node.selectedIndex = 0;
  };
  OptionObj.prototype.getTagFn = _getItemObjTitleTagFn;

  //CheckObj class
  function CheckObj(checkboxNode) {
    this.node = checkboxNode;
    this.value =  checkboxNode.value;
    this.name = checkboxNode.name.replace(/\[.*\]/g, ""); //消除[]
    this.text = _analysisMappingLabel(checkboxNode, formNode);
    if (this.text == "") {
      this.text = this.value;
    }
    this.multiple = (this.name !== checkboxNode.name)? true : false;
  }
  //CheckObj class prototype
  CheckObj.prototype.activeFn = function(){
    this.node.checked = true;
  };
  CheckObj.prototype.cancelFn = function() {
    this.node.checked = false;
  };
  CheckObj.prototype.getTagFn = _getItemObjTitleTagFn;
  //common plugin --------------------------------

  function _warning(inText) {
    inText = "Warning:  " + inText;
    if (console !== undefined && console.warn !== undefined) {
      console.warn(inText);
    } else if (config.debugMode === true){ // lte ie8
      alert(inText);
    }
  }

  function _arrayIndexOf(array,param) {
    if (array.indexOf) {
      return array.indexOf(param);
    } else { //lte ie8 或 dom
      for (var temp = 0; temp < array.length; temp++) {
        if (array[temp] == param) {
          return temp;
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
    var temp;
    var tempNode;
    if (document.querySelectorAll) {
      tempSelector = ((tagName != undefined)? tagName : "") + "[" + attribute + ((value != undefined )? "='" + value + "'" : "") + "]";
      returnArr = (parentNode || document).querySelectorAll(tempSelector);
    } else { //lte ie7
      tempNodeArr = (parentNode || document).getElementsByTagName((tagName || '*'));
      temp = 0;
      while (tempNode = tempNodeArr[temp++]) {
        if (
          value != undefined 
          && tempNode.getAttribute(attribute) == value
        ) {
          returnArr.push(tempNode);
        } else if (
          value == undefined 
          && tempNode.getAttribute(attribute)
        ){
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
  return returnParam;
}


