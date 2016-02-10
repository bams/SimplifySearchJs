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
  var menuNode = null; //選單
  var messageNode = null; //訊息/錯誤
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
  var constRegexp = {
    "ANY": /^.+$/,
    "NUMBER": /^\d+$/,
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
    "OPTION": 12,
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
    // "setTextCanMultipleByDom": setTextCanMultipleByDom,
    // "setTextCanMultipleById": setTextCanMultipleById,
  };

  if (config.debugMode) {
    returnParam.log = logParam;
  }

  function init() {
    
    
    if (formNode === null) {
      throw "not find form (id = " + config.formId + ")";
      return ;
    }
    if (config.hideForm == true) {
      formNode.style.display = 'none';
    }
    _setAutoInputNode();
    _analysisNodeData();

    //綁定autoComplete事件
    _addEventListener(autoNode, "keydown", _keyDownEventAction); //抓到游標原始位置
    _addEventListener(autoNode, "keydown", _controlSelectMenu); //控制autoComplete選單
    _addEventListener(autoNode, "keydown", _controlMsgMenu); //控制message選單
    _addEventListener(autoNode, "keyup", _checkWordChange); //輸入法異動只會觸發up事件
    _addEventListener(document, "click",_checkIfBlurAutoComplete);
    _addEventListener(autoNode, "blur", _checkIfBlurAutoComplete);
    _addEventListener(autoNode, "click", _clickInputEventAction);


    return returnParam;
  }
  function addDomDataMapping(inNode, valueToTextJson) {
    return returnParam;
  }
  function addRegexpById(id, inRegexp) {
    var tempNode = document.getElementById(id);
    if (tempNode === undefined || tempNode === null) {
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
    if (tempNode === undefined || tempNode === null) {
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
    if (nodeDataList[tempName] === undefined) {
      nodeDataList[tempName] = new SSJNodeItemObj();
    }
    nodeDataList[tempName].setTitleFn(inTitle);
    return returnParam;
  }
  // function setTextCanMultipleById(id) {
  //   var tempNode = document.getElementById(id);
  //   if (tempNode === undefined || tempNode === null) {
  //     _warning('function setTextCanMultipleById : getElementById("' + id + '") no exist');
  //     return returnParam;
  //   }
  //   return setTextCanMultipleByDom(tempNode);
  // }
  // function setTextCanMultipleByDom(textNode) {
  //   var custemTagType;
  //   if (textNode === undefined || textNode === null) {
  //     _warning("function setTextCanMultipleByDom param is undefined");
  //     return returnParam;
  //   }
  //   custemTagType = _getCustomTagType(textNode);
  //   if (custemTagType === constTagType.INPUT_TEXT || custemTagType === constTagType.TEXTAREA) {
  //     textNode.setAttribute('data-ssj-multiple',true);
  //   } else {
  //     _warning("function setTextCanMultiple param not allow <"+ textNode.tagName.toLowerCase() +"> object");
  //   }
  //   return returnParam;
  // }
  function logParam() {
    return {
      "config": config,
      "configRegExpList": configRegExpList,
      "configIgnoreList": configIgnoreList,
      "autoCompleteList": autoCompleteList,
      "nodeDataList": nodeDataList,
      "autoNode": autoNode,
      "menuNode": menuNode,
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
    if (domNode.name == undefined) {
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
    return tempTitle;
  }
  function _analysisNodeData() {
    var i;
    var tempNode;
    var tempTagType;
    //分析表單內的資料
    i = 0;
    while (tempNode = formNode[i++]) {
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
      if (tempNode.getAttribute('disabled') != null || tempNode.getAttribute('readonly') != null) {
        continue;
      }
      switch (tempTagType) {
        case constTagType.INPUT_NUMBER:
        case constTagType.INPUT_DATE:
        case constTagType.INPUT_EMAIL:
        case constTagType.INPUT_TEL:
        case constTagType.INPUT_URL:
        case constTagType.TEXTAREA:
        case constTagType.INPUT_TEXT:
          _addNodeDataList(new TextObj(tempNode));
          break;
        case constTagType.INPUT_RADIO:
        case constTagType.INPUT_CHECKBOX:
          _addNodeDataList(new CheckObj(tempNode));
          break;
        case constTagType.SELECT_ONE:
        case constTagType.SELECT_MULTIPLE:
          _analysisSelect(tempNode);
          break;
      }
    }
  }
  function _addNodeDataList(itemObj,parentNode) {
    var tempName = itemObj.name;
    if (nodeDataList[tempName] === undefined) {
      nodeDataList[tempName] = new SSJNodeItemObj();
    }
    nodeDataList[tempName].addItemObjFn(itemObj,parentNode);
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
    var tempObj;
    var tempName = domNode.name.replace(/\[.*\]/g, "");
    var tempMultiple = ((domNode.getAttribute('multiple') !== null)? true : false);
    if (domNode.length == 1) {
      return;
    }
    for (var i = 0; i < domNode.length; i++) {
      if (config.ignoreEmptyValue === true && domNode[i].value == '') {
        continue;
      }
      if (domNode[i].getAttribute('disabled') != null) {
        continue;
      }
      if (domNode[i].tagName == "OPTION") { //排除 <optgroup>
        tempObj = new OptionObj(i, tempName, tempMultiple, domNode[i]);
        _addNodeDataList(tempObj,domNode);
      }
    }
  }

  function _getCustomTagType(domNode) {
    var tempType = undefined;
    if (domNode == undefined || domNode == null) {
      return constTagType.NOALLOW;
    }
    switch (domNode.tagName) {
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
      case "OPTION":
        return constTagType.OPTION;
      default:
        return constTagType.NOALLOW
    }
    
  }
  function _addIgnoreNode(domNode) {
    var typeFlag;
    var type;
    var i;
    var tempIndex;
    var tempName;
    var tempParent;
    if ( constTagType.NOALLOW === _getCustomTagType(domNode)) {
      _warning("Not allow " + domNode.tagName);
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
        _warning("No find parent node <select>, so failed to ignore <option>");
        return false;
      }
    } else if (domNode.name !== undefined) {
      tempName = domNode.name.replace(/\[.*\]/g, "");
    }
    if (tempName === undefined) {
      _warning("This node doesn't have name");
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

    // if (nodeDataList[tempName] !== undefined && nodeDataList[tempName].itemObjs !== undefined) {
    //   if (domNode.tagName == "SELECT" && nodeDataList[tempName].parentNode === domNode) {
    //     nodeDataList[tempName] = undefined;
    //   } else {
    //     i = -1;
    //     while (tempObj = nodeDataList[tempName].itemObjs[++i]) {
    //       if (tempObj.node === domNode) {
    //         nodeDataList[tempName].itemObjs.splice(i,1);
    //         //刪除預設值的設定
    //         if (tempObj instanceof TextObj) {
    //           nodeDataList[tempName].defaultArr.splice(i,1);
    //         } else {
    //           tempIndex = _arrayIndexOf(nodeDataList[tempName].defaultArr, domNode);
    //           if (tempIndex !== -1) {
    //             nodeDataList[tempName].defaultArr.splice(tempIndex,1);
    //           }
    //         }
    //         break;
    //       }
    //     }
    //   }
    // }
    if (_arrayIndexOf(configIgnoreList, domNode)== -1) {
      domNode.setAttribute('data-ignore-flag', configIgnoreList.length);
      configIgnoreList.push(domNode);
    }
    return true;

  }

  function _addRegexpDom(domNode, regexp) {
    var type;
    var i;
    var tempName;
    var tempList; 
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
    tempName = domNode.name.replace(/\[.*\]/g, "");
    if (nodeDataList[tempName] !== undefined) {
      nodeDataList[tempName].changeRegexpFn(domNode, regexp);
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
  }

  function _clickInputEventAction(e) {
    _keyDownEventAction(e);
    var tempSlice;
    var i;
    var tempAutoObj;
    if (menuNode === null) {
      tempSlice = autoNode.value.slice(0,keyinPosition).length;
      i = autoCompleteList.length;
      while (tempAutoObj =  autoCompleteList[--i]) {
        if (tempAutoObj.sort <= tempSlice) {
          _selectAutoComplete(i, true);
          break;
        }
      }
    }
  }

  function _checkIfBlurAutoComplete(e) {
    console.log("into _checkIfBlurAutoComplete");
    if (
      document.activeElement !== autoNode
      && e.target !== autoNode
      && document.activeElement !== menuNode  
      && e.target.parentNode !== menuNode 
      && e.target.parentNode.parentNode !== menuNode
      ) {
      
       _removeInvalidWord(e);
    }
  }

  function _checkWordChange(e) {
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
    var i;
    if (inputText == "") { //清空輸入框
      diffFlag = true;
      tempRemoveList = autoCompleteList;
    } else {
      //文字片段可能會涵蓋空白，因此必須先判斷已選的文字，切割判斷完後再判斷剩下的
      inputText = " " + inputText + " ";

      i = 0;
      while (tempAutoObj = autoCompleteList[i++]) {
        if (tempAutoObj === undefined) {
          continue;
        }
        tempWord = " " + tempAutoObj.getTextFn() + " ";
        tempWIndex = inputText.indexOf(tempWord);
        if (tempWIndex !== -1) {
          inputText = inputText.replace(tempWord, new Array(tempWord.length).join(" ")); //only replace first word
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
        inputText = inputText.replace(tempWord, new Array(tempWord.length).join(" ")); //only replace first word
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
      while (tempAutoObj = tempRemoveList[i++]) {
        tempObj = tempAutoObj.getObjFn();
        if (tempObj !== undefined) {
          tempName = tempObj.name;
          if (!nodeDataList[tempName].multiple) {
            nodeDataList[tempName].noShowInMenuFlag = false;
          }
          tempObj.usedFlag = false;
          tempObj.cancelFn();
          tempAutoObj.removeObjFn();
        }
      }
      _removeMenuBox();
      _removeMessageBox();
      autoCompleteList = tempList;
      _checkAutoComplete();
    } else {
      if (menuNode === null) { 
        switch (e.keyCode) {
          case constKeyCode.SPACE:
            //如果空白前後有未設定的 autoObj 就不執行清除
            tempSlice = autoNode.value.slice(0, keyinPosition).length;
            i = autoCompleteList.length;
            while (tempAutoObj = autoCompleteList[--i]) {
              if (
                (tempSlice < tempAutoObj.sort 
                  && tempSlice >= tempAutoObj.sort - 2
                ) 
                && tempAutoObj.getObjFn() !== undefined 
                && autoCompleteList[i - 1].getObjFn() !== undefined
                ) {
                  _removeInvalidWord(e, i - 1);
              } else if(tempSlice < tempAutoObj.sort - 2) {
                break;
              }
            }
            break;
          case constKeyCode.TAB:
            _removeInvalidWord(e);
            break;
          case constKeyCode.DOWN:
            tempSlice = autoNode.value.slice(0, keyinPosition).length;
            i = autoCompleteList.length;
            while (tempAutoObj =  autoCompleteList[--i]) {
              if (tempAutoObj.sort <= tempSlice) {
                _selectAutoComplete(i, true);
                break;
              }
            }
        }
      }
    }
  }
  function _controlMsgMenu(e) {
    if (messageNode === null) {
      return false;
    }
    if(e.target === messageNode
      || e.keyCode === constKeyCode.ESC
      || e.keyCode === constKeyCode.TAB
      || e.keyCode === constKeyCode.ENTER
      ) {
      var autoItemIndex = messageNode.getAttribute('data-auto-no');
      var tempIndexArr = autoItemIndex.split(",");
      if(e.target === messageNode){
        autoNode.focus();
      }

      _removeInvalidWord(e, tempIndexArr[0] - 1);
      e.preventDefault(); //停止冒泡事件
    }     
  }
  function _controlSelectMenu(e) {
    if (menuNode === null) {
      return false;
    }
    var tempFocusItem = menuNode.getAttribute('data-select');
    var autoItemIndex;
    var tempIndexArr;
    var tempAutoObj;
    var tempName;
    var tempIndex;
    var tempObj;

    switch (e.keyCode) {
      case constKeyCode.ESC: //esc
        _removeMenuBox();
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
        autoItemIndex = menuNode.getAttribute('data-auto-no');
        tempIndexArr = autoItemIndex.split(",");
        tempAutoObj = autoCompleteList[tempIndexArr[0]];
        if (menuNode.childElementCount == 2) { //若只有一個選項，按下ENTER等同按下TAB
          tempFocusItem = 1;
        }
        if (tempFocusItem == 0) {
          _setAutoCompleteWord(tempIndexArr[tempIndexArr.length - 1]);
        } else {
          tempName = menuNode.children[tempFocusItem].getAttribute('data-name');
          tempIndex = menuNode.children[tempFocusItem].getAttribute('data-index');
          tempObj = nodeDataList[tempName].itemObjs[tempIndex];
          if (!nodeDataList[tempName].multiple) {
            nodeDataList[tempName].noShowInMenuFlag = true;
          } else {
            tempObj.usedFlag = true;
          }
          
          if (tempObj instanceof TextObj) {
            tempObj.setTextFn(menuNode.children[0].textContent);
          }
          tempAutoObj.setObjFn(tempObj);
          if (tempIndexArr.length > 1) {
            autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
          }
          _setAutoCompleteWord(tempIndexArr[0]);
        }
        _removeMenuBox();
        _checkAutoComplete(tempIndexArr[0]-1);
        e.preventDefault(); //停止冒泡事件
        break;
    }
  }

  function _clickMenuItem(e) {
    var tempNode = e.target;
    var index;
    var autoItemIndex;
    var tempIndexArr
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
    index = _arrayIndexOf(menuNode.children, tempNode);
    if (index == -1 || index == 0) {
      return;
    } else {
      menuNode.setAttribute('data-select', index);
      tempNode.className = "focus";
    }
    autoItemIndex = menuNode.getAttribute('data-auto-no');
    tempIndexArr = autoItemIndex.split(",");
    tempAutoObj = autoCompleteList[tempIndexArr[0]];
    tempName = menuNode.children[index].getAttribute('data-name');
    tempIndex = menuNode.children[index].getAttribute('data-index');
    tempObj = nodeDataList[tempName].itemObjs[tempIndex];
    if (!nodeDataList[tempName].multiple) {
      nodeDataList[tempName].noShowInMenuFlag = true;
    } else {
      tempObj.usedFlag = true;
    }
    if (tempObj instanceof TextObj) {
      tempObj.setTextFn(menuNode.children[0].textContent);
    }
    tempAutoObj.setObjFn(tempObj);
    if (tempIndexArr.length > 1) {
      autoCompleteList.splice(tempIndexArr[1], tempIndexArr.length - 1);
    }
    _setAutoCompleteWord(tempIndexArr[0]);
    _removeMenuBox();
    autoNode.focus();
    _checkAutoComplete(tempIndexArr[0]-1);
    e.preventDefault(); //停止冒泡事件
  }
  function _createMessageBox(defaultWord, autoItemIndexArr) {
    var divNode = document.createElement("div");
    var height = autoNode.offsetHeight || autoNode.clientHeight; 
    var width = autoNode.offsetWidth || autoNode.clientWidth;
    var top = autoNode.offsetTop || autoNode.clientTop; 
    var left = autoNode.offsetLeft || autoNode.clientLeft;
    var spanNode;
    divNode.id = "ssj-msg-" + uiRandomNo;
    divNode.className = config.msgClass; 
    divNode.setAttribute('data-auto-no', autoItemIndexArr.join(","));
    divNode.style.position = "absolute";//absolute
    divNode.style.zIndex = 98;
    divNode.style.top = (top + height) + 'px';
    divNode.style.left = left + 'px';
    divNode.style.minWidth = width + 'px';
    divNode.appendChild(document.createTextNode(defaultWord));
    // divNode.addEventListener('click', _controlMsgMenu);
    _removeMessageBox();
    _addEventListener(divNode, 'click', _controlMsgMenu);
    autoNode.parentNode.appendChild(divNode);
    messageNode = divNode;
  }
  //keepMappingKey[] = {"name": tempName, "index": i, "sort":tempSort};
  function _createMenuBox(defaultWord, keepMappingKey, autoItemIndexArr) {    
    _removeMessageBox();
    if (menuNode !== null) {
      return;
    }
    var selectNode = document.createElement("ul");
    var height = autoNode.offsetHeight || autoNode.clientHeight; 
    var width = autoNode.offsetWidth || autoNode.clientWidth;
    var top = autoNode.offsetTop || autoNode.clientTop; 
    var left = autoNode.offsetLeft || autoNode.clientLeft;
    var optionNode;
    var spanNode;
    var i;
    var tempMappingObj;
    var tempTitle;
    var tempName;
    var tempIndex;
    var tempObj;
    selectNode.id = "ssj-menu-" + uiRandomNo; 
    selectNode.className = config.menuClass;
    selectNode.setAttribute('data-select', 0);
    selectNode.setAttribute('data-auto-no', autoItemIndexArr.join(","));
    selectNode.style.position = "absolute";//absolute
    selectNode.style.zIndex = 99;
    selectNode.style.top = (top + height) + 'px';
    selectNode.style.left = left + 'px';
    selectNode.style.minWidth = width + 'px';

    optionNode = document.createElement("li");
    optionNode.setAttribute('data-name', '');
    optionNode.setAttribute('data-index', '');
    optionNode.appendChild(document.createTextNode(defaultWord));

    optionNode.style.display = "none";
    optionNode.className = "focus";
    selectNode.appendChild(optionNode);

    i = 0;
    var optionText;
    while (tempMappingObj = keepMappingKey[i++]) {
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
      if (config.hideTag === false) {
        tempTitle = nodeDataList[tempName].title;
        if (tempTitle !== '' && tempTitle !== undefined) {
          spanNode = document.createElement("span");
          spanNode.className = config.tagClass;
          // spanNode.style.float = "right";
          spanNode.appendChild(document.createTextNode(tempTitle));
          optionNode.appendChild(spanNode);
        }
      }
      _addEventListener(optionNode, 'click', _clickMenuItem);
      // optionNode.addEventListener('click', _clickMenuItem);
      selectNode.appendChild(optionNode);
    }
    autoNode.parentNode.appendChild(selectNode);
    menuNode = selectNode;
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
    }
  }
  function _removeMessageBox() {
    if (messageNode !== null) {
      messageNode.remove();
      messageNode = null;
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
    var keepSelectKey = [];
    var keepRegexpKey = [];
    var keepMappingKey = [];
    var tempName;
    var tempObj;
    var tempSort; //like weights ,but smaller first
    if (tempFocusAutoObj === undefined) {
      return false;
    }
    if (tempFocusAutoObj.getObjFn() !== undefined) {
      // tempFocusAutoObj.getObjFn().activeFn();
      if (resetFlag !== true) {
        return false;
      } else {
        //TODO
        return false;
      }
    }
    //抓取前後未指定obj的輸入值
    rangeArr.push(autoObjIndex);
    tempWords = tempFocusAutoObj.getTextFn();
    i = autoObjIndex;
    while (tempAutoObj = autoCompleteList[--i]) {
      if (tempAutoObj.getObjFn() === undefined) {
        rangeArr.unshift(i);
        tempWords = tempAutoObj.getTextFn() + " " + tempWords;
      } else {
        break;
      }
    }
    i = autoObjIndex;
    while (tempAutoObj = autoCompleteList[++i]) {
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
      while (tempObj = nodeDataList[tempName].itemObjs[++i]) {
        if (tempObj.usedFlag) {
          continue;
        } 
        if (tempObj instanceof TextObj) {
          if (tempObj.regexp.test(tempWords) === true) {
            if (tempObj.regexp === constRegexp.ANY) {
              tempSort = 500;
            } else {
              tempSort = 100;
            }
            keepMappingKey.push({"name": tempName, "index": i, "sort": tempSort});
          }
        } else if (tempObj instanceof CheckObj || tempObj instanceof OptionObj) {
          if (tempObj.text.toLowerCase().indexOf(tempWords.valueOf().toLowerCase()) !== -1) {
            if (tempObj.text.length == tempWords.valueOf().length) {
              tempSort = 1;
            } else {
              tempSort = 1000;
            }
            keepMappingKey.push({"name": tempName, "index": i, "sort":tempSort});

          }
        } else {
          _warning("unknow ItemObj class");
        }
      }
    }
    keepMappingKey.sort(function(a, b) {
      return a.sort - b.sort;
    });
    if (keepMappingKey.length === 0) {
      _removeMenuBox();
      _createMessageBox(tempWords, rangeArr);
      return -1;
    } else {
      _createMenuBox(tempWords, keepMappingKey, rangeArr);
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
      if (i > 0) {
        tempText = tempText + " ";
      }
      tempText = tempText + autoCompleteList[i].getTextFn();
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
        _setKeyinPosition(autoNode, 0);
      }
    } else if (autoItemIndex !== undefined) {
      tempAutoObj = autoCompleteList[autoItemIndex];
      newPosition = tempAutoObj.sort + tempAutoObj.getTextFn().length + ((addSpaceFlag)? 1 : 0);
      _setKeyinPosition(autoNode, newPosition);
    }
  }

  function _removeInvalidWord(e, autoObjIndex) {
    var tempAutoObj;
    var newAutoComleteList = [];
    var cutLength = 0;
    var i;
    i = 0;
    while (tempAutoObj = autoCompleteList[i++]) {
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
      _removeMenuBox();
    }
    _removeMessageBox();
  }

  function _resetForm() {
    var tempName;
    for (tempName in nodeDataList) {
      //TODO 使用defaultArr
    }
  }
  function _setDefaultValue(itemObj) {
    var tempName = itemObj.name;
    var tempMultiple = itemObj.multiple;
    var tempValue  = itemObj.value;
    if (defaultValueList[tempName] === undefined || !tempMultiple) {
      defaultValueList[tempName] = [];
    }
    defaultValueList[tempName].push({"obj": itemObj, "value": tempValue});
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
    if (domNode.tagName == "SELECT") {
      return;
    } else {
      i = -1;
      while (tempObj = this.itemObjs[++i]) {
        if (tempObj.node === domNode) {
          this.itemObjs.splice(i,1);
          //刪除預設值的設定
          if (tempObj instanceof TextObj) {
            this.defaultArr.splice(i,1);
          } else {
            tempIndex = _arrayIndexOf(this.defaultArr, domNode);
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
    var i = -1;
    while (tempObj = this.itemObjs[++i]) {
      if (!(tempObj instanceof TextObj)) {
        _warning("This dom cannot set RegExp");
        return;
      }
      if (tempObj.node === domNode) {
        tempObj.setRegexpFn(regexp);
        if (!regexp.test(this.defaultArr[i])) {
          _warning("Text default value be cleared! because does not match for new RegExp.");
          this.defaultArr[i] = "";
        }
        break;
      }
    }
    
  }

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
      if (this.defaultArr.length == 0) {
        //不論 config.ignoreEmptyValue 是否有排除，都要記錄預設選項
        i = 0;
        while (tempNode = inParentNode.selectedOptions[i++]) {
          this.defaultArr.push(tempNode);
        }
      }
      if (itemObj.usedFlag) {
        if (!this.multiple) {
          this.noShowInMenuFlag = true;
        }
      }   
    } else if (itemObj instanceof CheckObj) {
      if (itemObj.usedFlag) {
        this.defaultArr.push(itemObj.node);
        if (!this.multiple) {
          this.noShowInMenuFlag = true;
        }
      }
    } 
  };

  function autoCompleteItemObj(inText) {
    var text = inText;
    var custemObj; //TextObj,OptionObj,CheckObj...
    this.sort = 0;
    
    this.setObjFn = function(inObj) {
      text = inObj.text;
      custemObj = inObj;
      custemObj.activeFn();
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
      custemObj = undefined;
    };
  }


  //TextObj class
  function TextObj(inputDomNode) {
    var regexpIndex = inputDomNode.getAttribute('data-regexp-flag');
    // var multipleFlag = inputDomNode.getAttribute('data-ssj-multiple');
    //TODO 增加判斷 maxlength 屬性
    this.node = inputDomNode;
    this.regexp = undefined; 
    this.name = inputDomNode.name.replace(/\[.*\]/g, ""); //消除[]
    this.multiple = (this.name !== inputDomNode.name)? true : false;
    
    //inputDomNode.getAttribute('data-regexp')
    if (regexpIndex !== null) {
      if (configRegExpList[regexpIndex] !== undefined && configRegExpList[regexpIndex].node === inputDomNode) {
        this.regexp = configRegExpList[regexpIndex].regexp;
      } else {
        //異常，可能是被改資料，進入容錯處理
        for (var i = configRegExpList.length - 1; i >= 0; i++) {
          if (configRegExpList[i].node === inputDomNode) {
            this.regexp = configRegExpList[i].regexp;
            break;
          }
        }
      }
    }
    if (this.regexp === undefined) {
      this.regexp =  constRegexp.ANY;
    }
    if (this.node.value !== "") {
      if (this.regexp.test(this.node.value)) {
        this.text = this.node.value;
      } else {
        _warning("value of [name=" + inputDomNode.name + "]don't match regexp, so delete the value");
        this.node.value = "";
      }
    }
    this.usedFlag = (this.node.value !== "")? true: false;
  }
  
  //TextObj class prototype
  TextObj.prototype.activeFn = function () {
    this.node.value = this.text;

  };
  TextObj.prototype.cancelFn = function () {
    this.node.value = "";
    this.text = "";
  };
  TextObj.prototype.setTextFn = function (text) {
    this.text = text;
  };
  TextObj.prototype.setRegexpFn = function (regexp) {
    this.regexp = regexp;
  }


  //OptionObj class
  function OptionObj(index, inName, inMultiple, optionDomNode) {
    this.node = optionDomNode;
    this.name = inName; //消除[]
    this.selectedIndex = index;
    this.usedFlag = (optionDomNode.selected == true)? true: false;
    this.value =  optionDomNode.value;
    this.text = optionDomNode.text;
    this.multiple = inMultiple;
  }
  //OptionObj class prototype
  OptionObj.prototype.activeFn = function () {
    this.node.selected = true;

    //this.node.selectedIndex = this.selectedIndex;
  };
  OptionObj.prototype.cancelFn = function () {
    // this.node.selectedIndex = 0;
    this.node.selected = false;
  };
  

  //CheckObj class
  function CheckObj(checkboxNode) {
    this.node = checkboxNode;
    this.value =  checkboxNode.value;
    this.name = checkboxNode.name.replace(/\[.*\]/g, ""); //消除[]
    this.usedFlag = (checkboxNode.checked == true)? true: false;
    this.text = _analysisMappingLabel(checkboxNode, formNode);
    if (this.text == "") {
      this.text = this.value;
    }
    this.multiple = (this.name !== checkboxNode.name)? true : false;

  }
  //CheckObj class prototype
  CheckObj.prototype.activeFn = function() {
    this.node.checked = true;
  };
  CheckObj.prototype.cancelFn = function() {
    this.node.checked = false;
  };


  //common plugin --------------------------------

  function _warning(inText) {
    inText = "Warning:  " + inText;
    if (console !== undefined && console.warn !== undefined) {
      console.warn(inText);
    } else if (config.debugMode === true) { // lte ie8
      alert(inText);
    }
  }

  function _arrayIndexOf(array,param) {
    if (array.indexOf) {
      return array.indexOf(param);
    } else { //lte ie8 或 dom
      for (var i = 0; i < array.length; i++) {
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
      tempSelector = ((tagName != undefined)? tagName : "") + "[" + attribute + ((value != undefined )? "='" + value + "'" : "") + "]";
      returnArr = (parentNode || document).querySelectorAll(tempSelector);
    } else { //lte ie7
      tempNodeArr = (parentNode || document).getElementsByTagName((tagName || '*'));
      i = 0;
      while (tempNode = tempNodeArr[i++]) {
        if (
          value != undefined 
          && tempNode.getAttribute(attribute) == value
        ) {
          returnArr.push(tempNode);
        } else if (
          value == undefined 
          && tempNode.getAttribute(attribute)
        ) {
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


