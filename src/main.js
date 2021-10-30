'use strict';

var obsidian = require('obsidian');

export default class CodeBlockCopyInEditMode extends obsidian.Plugin {
  constructor() {
    super(...arguments);
    const config = {}

    const codeBlockRegex = /^( +)?(```)/
    const codeBlockStartRegex = codeBlockRegex
    const codeBlockEndRegex = codeBlockRegex

    function findCodeBlocks(cm, ignoreIncomplete = true, start = 0) {
      var insideCodeBlock = false
      var codeBlocks = []
      var codeBlockIndex = 0
      cm.eachLine(start, cm.lineCount(), (lineHandle, i) => {
        const matchCodeBlockStart = lineHandle.text.match(codeBlockStartRegex)
        if (insideCodeBlock) {
          const matchCodeBlockEnd = lineHandle.text.match(codeBlockEndRegex)
          if (matchCodeBlockStart && !ignoreIncomplete) {
            codeBlocks[codeBlockIndex].start = lineHandle
          } else if (matchCodeBlockEnd) {
            codeBlocks[codeBlockIndex].end = lineHandle
            codeBlockIndex++
            insideCodeBlock = false
          }
        } else {
          if (matchCodeBlockStart) {
            codeBlocks[codeBlockIndex] = {
              start: lineHandle,
              text: '',
              getContents() {
                return cm.getRange({
                  line: this.start.lineNo() + 1,
                  ch: 0
                }, {
                  line: this.end.lineNo(),
                  ch: 0
                })
              }
            }
            insideCodeBlock = true
          }
        }
      })
      codeBlocks = codeBlocks.filter(codeBlock => codeBlock.end)
      return codeBlocks
    }

    function removeWidget(lineHandle) {
      if (lineHandle.widgets) {
        lineHandle.widgets.forEach(widget => {
          if (widget.className === 'code-block-copy-button') {
            widget.clear()
          }
        })
      }
    }

    function addWidget(cm, lineHandle, codeBlock) {
      const div = document.createElement('div')
      const button = document.createElement('button')
      button.innerHTML = 'Copy'
      button.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.getContents()).then(function() {
          button.blur();
          button.innerText = 'Copied';
        }, function(error) {
          button.innerText = 'Error';
        });
        setTimeout(() => {
          button.innerText = 'Copy';
        }, 2000);
      })
      div.appendChild(button)
      cm.addLineWidget(lineHandle, div, {
        className: 'code-block-copy-button'
      })
    }

    var codeBlocks = null

    this.addCopyButton = (cm, change) => {
      if (codeBlocks) {
        codeBlocks.forEach(codeBlock => {
          removeWidget(codeBlock.end)
        });
      }
      codeBlocks = findCodeBlocks(cm)
      codeBlocks.forEach(codeBlock => {
        addWidget(cm, codeBlock.start, codeBlock)
      });
    }

  }
  onload() {
    this.registerCodeMirror((cm) => {
      cm.on("change", this.addCopyButton);
    });
  }
  onunload() {
    this.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("change", this.addCopyButton);
    });
  }
}
