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
  
