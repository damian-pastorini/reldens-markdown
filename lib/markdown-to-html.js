/**
 *
 * Reldens - MarkdownToHTML
 *
 */

class MarkdownToHTML
{

    constructor(config)
    {
        this.classes = this.get(config, 'classes', {});
        this.transformers = this.get(config, 'transformers', {});
        this.imageSrcSuffix = this.get(config, 'imageSrcSuffix', '/');
        this.linksHrefSuffix = this.get(config, 'linksHrefSuffix', '/');
        this.headingElements = [
            {tag: 'h1', markdownKey: '#', regex: /^# (.+)$/gm},
            {tag: 'h2', markdownKey: '##', regex: /^## (.+)$/gm},
            {tag: 'h3', markdownKey: '###', regex: /^### (.+)$/gm},
            {tag: 'h4', markdownKey: '####', regex: /^#### (.+)$/gm},
            {tag: 'h5', markdownKey: '#####', regex: /^##### (.+)$/gm},
            {tag: 'h6', markdownKey: '######', regex: /^###### (.+)$/gm}
        ];
        this.formattingElements = [
            {tag: 'strong', markdownKey: 'b', regex: /\*\*(.+?)\*\*/g},
            {tag: 'em', markdownKey: 'i', regex: /\*(.+?)\*/g},
            {tag: 'strong+em', markdownKey: 'b+i', regex: /\*\*\*(.+?)\*\*\*/g, special: true}
        ];
        this.blockquoteElement = {tag: 'blockquote', markdownKey: '>', regex: /^>[ ]?(.+)$/gm};
        this.hrElement = {tag: 'hr', markdownKey: 'hr', regex: /^([\*]{3,}|[\-]{3,}|[\_]{3,})$/gm};
        this.taskListElement = {
            tag: 'ul',
            markdownKey: 'tasklist',
            regex: /^- \[([ x])\] (.+)$/gm,
            className: 'task-list'
        };
        this.linkElement = {tag: 'a', markdownKey: 'a', regex: /\[(.+?)\]\((.+?)\)/g};
        this.imageElement = {tag: 'img', markdownKey: 'img', regex: /!\[(.+?)\]\((.+?)\)/g};
        this.listElements = [
            {tag: 'ul', items: {tag: 'li', regex: /^[ ]*\*[ ]+(.+)$/gm}, wrapperRegex: /(<li.+<\/li>\n)+/g},
            {tag: 'ol', items: {tag: 'li', regex: /^[ ]*\d+\.[ ]+(.+)$/gm}, wrapperRegex: /(<li.+<\/li>\n)+/g}
        ];
        this.paragraphElement = {tag: 'p', breakRegex: /\n\n/g};
    }

    transform(markdown)
    {
        if(!markdown){
            return '';
        }
        let html = markdown;
        let codeBlocks = [];
        let inlineBlocks = [];
        html = this.extractCodeBlocks(html, codeBlocks);
        html = this.extractInlineCode(html, inlineBlocks);
        html = this.transformBlockquote(html);
        html = this.transformHorizontalRule(html);
        html = this.transformElements(html, this.headingElements);
        html = this.transformElements(html, this.formattingElements);
        html = this.transformUrlElement(html, this.imageElement, (element, p1, p2, classAttr, url) => {
            return '<'+element.tag+' src="'+url+'" alt="'+p1+'"'+classAttr+'/>';
        });
        html = this.transformUrlElement(html, this.linkElement, (element, p1, p2, classAttr, url) => {
            return '<'+element.tag+' href="'+url+'"'+classAttr+'>'+p1+'</'+element.tag+'>';
        });
        html = this.transformTaskList(html);
        html = this.transformDashList(html);
        html = this.transformLists(html);
        html = this.transformParagraphs(html);
        html = this.restoreBlocks(html, inlineBlocks, 'INLINE_CODE');
        html = this.restoreBlocks(html, codeBlocks, 'CODE_BLOCK');
        return this.isValidHtml(html) ? html : this.sanitizeHtml(html);
    }

    extractCodeBlocks(text, codeBlocks)
    {
        return text.replace(/```([^\n]*)\n([\s\S]+?)```/g, (match, language, content) => {
            let languageClass = '';
            let isLanguageSpecified = language && language.trim();
            if(isLanguageSpecified){
                languageClass = ' class="language-'+language.trim()+'"';
            }
            let codeBlock = '<code'+languageClass+'>'+"\n"+content+'</code>';
            codeBlocks.push(codeBlock);
            return '{{CODE_BLOCK_' + (codeBlocks.length - 1) + '}}';
        });
    }

    extractInlineCode(text, inlineBlocks)
    {
        let inlineCodeClass = this.get(this.classes, 'inline-code', 'inline-code-block');
        return text.replace(/`([^`\n]+?)`/g, (match, content) => {
            let inlineCode = '<span class="'+inlineCodeClass+'">'+content+'</span>';
            inlineBlocks.push(inlineCode);
            return '{{INLINE_CODE_' + (inlineBlocks.length - 1) + '}}';
        });
    }

    restoreBlocks(text, blocks, blockType)
    {
        let regex = new RegExp('{{' + blockType + '_(\\d+)}}', 'g');
        return text.replace(regex, (match, index) => {
            return blocks[parseInt(index)];
        });
    }

    transformBlockquote(text)
    {
        let element = this.blockquoteElement;
        let tagClasses = this.get(this.classes, element.tag, '');
        let classAttr = tagClasses ? ' class="'+tagClasses+'"' : '';
        let lines = text.split('\n');
        let inBlockquote = false;
        let blockquoteContent = '';
        let result = [];
        for(let i = 0; i < lines.length; i++){
            let line = lines[i];
            let match = line.match(element.regex);
            if(match){
                inBlockquote = true;
                blockquoteContent = this.updateBlockquoteContent(blockquoteContent, match[1]);
                continue;
            }
            inBlockquote = this.endBlockquoteIfNeeded(inBlockquote, blockquoteContent, result, classAttr, element);
            blockquoteContent = this.resetContentIfNeeded(inBlockquote, blockquoteContent);
            result.push(line);
        }
        this.finalizeBlockquote(inBlockquote, blockquoteContent, result, classAttr, element);
        return result.join('\n');
    }

    updateBlockquoteContent(content, matchContent)
    {
        if(0 === content.length){
            return matchContent;
        }
        return content + '\n' + matchContent;
    }

    endBlockquoteIfNeeded(inBlockquote, content, result, classAttr, element)
    {
        if(!inBlockquote){
            return false;
        }
        result.push('<'+element.tag+classAttr+'>'+content+'</'+element.tag+'>');
        return false;
    }

    resetContentIfNeeded(inBlockquote, content)
    {
        if(!inBlockquote){
            return '';
        }
        return content;
    }

    finalizeBlockquote(inBlockquote, content, result, classAttr, element)
    {
        if(!inBlockquote){
            return;
        }
        result.push('<'+element.tag+classAttr+'>'+content+'</'+element.tag+'>');
    }

    transformHorizontalRule(text)
    {
        let element = this.hrElement;
        let tagClasses = this.get(this.classes, element.tag, '');
        let classAttr = tagClasses ? ' class="'+tagClasses+'"' : '';
        return this.replaceMarkdown(text, element.regex, element.markdownKey, () => {
            return '<'+element.tag+classAttr+'>';
        });
    }

    transformTaskList(text)
    {
        let element = this.taskListElement;
        let ulClasses = this.get(this.classes, element.tag, '') + ' ' + element.className;
        let ulClassAttr = ' class="'+ulClasses+'"';
        let liClasses = this.get(this.classes, 'li', '');
        let liClassAttr = liClasses ? ' class="'+liClasses+'"' : '';
        let lines = text.split('\n');
        let inList = false;
        let listItems = [];
        let result = [];
        for(let i = 0; i < lines.length; i++){
            let line = lines[i];
            let match = line.match(element.regex);
            if(match){
                inList = this.processTaskMatch(match, inList, listItems, liClassAttr);
                continue;
            }
            inList = this.endTaskListIfNeeded(inList, listItems, result, ulClassAttr);
            listItems = [];
            result.push(line);
        }
        this.finalizeTaskList(inList, listItems, result, ulClassAttr);
        return result.join('\n');
    }

    transformDashList(text)
    {
        let ulClasses = this.get(this.classes, 'ul', '');
        let ulClassAttr = ulClasses ? ' class="'+ulClasses+'"' : '';
        let liClasses = this.get(this.classes, 'li', '');
        let liClassAttr = liClasses ? ' class="'+liClasses+'"' : '';
        let lines = text.split('\n');
        let inList = false;
        let listItems = [];
        let result = [];
        for(let i = 0; i < lines.length; i++){
            let line = lines[i];
            let isDashItem = line.match(/^[ ]*-[ ]+([^[].*)$/);
            if(isDashItem){
                let content = line.replace(/^[ ]*-[ ]+/, '');
                inList = true;
                listItems.push('<li'+liClassAttr+'>'+content+'</li>');
                continue;
            }
            if(inList){
                result.push('<ul'+ulClassAttr+'>');
                for(let j = 0; j < listItems.length; j++){
                    result.push(listItems[j]);
                }
                result.push('</ul>');
                inList = false;
                listItems = [];
            }
            result.push(line);
        }
        if(inList){
            result.push('<ul'+ulClassAttr+'>');
            for(let i = 0; i < listItems.length; i++){
                result.push(listItems[i]);
            }
            result.push('</ul>');
        }
        return result.join('\n');
    }

    processTaskMatch(match, inList, listItems, liClassAttr)
    {
        let checked = 'x' === match[1] ? ' checked' : '';
        let item = '<li'+liClassAttr+'><input type="checkbox"'+checked+' disabled> '+match[2]+'</li>';
        listItems.push(item);
        return true;
    }

    endTaskListIfNeeded(inList, listItems, result, ulClassAttr)
    {
        if(!inList){
            return false;
        }
        result.push('<ul'+ulClassAttr+'>');
        for(let i = 0; i < listItems.length; i++){
            result.push(listItems[i]);
        }
        result.push('</ul>');
        return false;
    }

    finalizeTaskList(inList, listItems, result, ulClassAttr)
    {
        if(!inList){
            return;
        }
        result.push('<ul'+ulClassAttr+'>');
        for(let i = 0; i < listItems.length; i++){
            result.push(listItems[i]);
        }
        result.push('</ul>');
    }

    transformElements(text, elements)
    {
        for(let element of elements){
            if(element.special){
                let bClasses = this.get(this.classes, 'b', '');
                let bClassAttr = bClasses ? ' class="'+bClasses+'"' : '';
                let iClasses = this.get(this.classes, 'i', '');
                let iClassAttr = iClasses ? ' class="'+iClasses+'"' : '';
                text = this.replaceMarkdown(text, element.regex, element.markdownKey, (match, p1) => {
                    return '<strong'+bClassAttr+'><em'+iClassAttr+'>'+p1+'</em></strong>';
                });
                continue;
            }
            let tagClasses = this.get(this.classes, element.tag, '');
            let classAttr = tagClasses ? ' class="'+tagClasses+'"' : '';
            text = this.replaceMarkdown(text, element.regex, element.markdownKey, (match, p1) => {
                return '<'+element.tag+classAttr+'>'+p1+'</'+element.tag+'>';
            });
        }
        return text;
    }

    transformUrlElement(text, element, templateCallback)
    {
        let tagClasses = this.get(this.classes, element.tag, '');
        let classAttr = tagClasses ? ' class="'+tagClasses+'"' : '';
        return this.replaceMarkdown(text, element.regex, element.markdownKey, (match, p1, p2) => {
            let url = p2;
            let suffix = element.tag === 'img' ? this.imageSrcSuffix : this.linksHrefSuffix;
            if(!url.match(/^(https?:\/\/|http:\/\/|mailto:|tel:|ftp:)/i)){
                url = suffix + url;
            }
            return templateCallback(element, p1, p2, classAttr, url);
        });
    }

    transformLists(text)
    {
        for(let listElement of this.listElements){
            let liClasses = this.get(this.classes, listElement.items.tag, '');
            let liClassAttr = liClasses ? ' class="'+liClasses+'"' : '';
            text = text.replace(listElement.items.regex, (match, p1) => {
                return '<'+listElement.items.tag+liClassAttr+'>'+p1+'</'+listElement.items.tag+'>';
            });
            let listClasses = this.get(this.classes, listElement.tag, '');
            let listClassAttr = listClasses ? ' class="'+listClasses+'"' : '';
            text = text.replace(listElement.wrapperRegex, (match) => {
                return '<'+listElement.tag+listClassAttr+'>'+match+'</'+listElement.tag+'>';
            });
        }
        return text;
    }

    transformParagraphs(text)
    {
        let element = this.paragraphElement;
        let tagClasses = this.get(this.classes, element.tag, '');
        let tagClassAttr = tagClasses ? ' class="'+tagClasses+'"' : '';
        let lines = text.split('\n');
        let inParagraph = false;
        let paragraphContent = '';
        let result = [];
        for(let i = 0; i < lines.length; i++){
            if(!lines[i].trim()){
                if(inParagraph){
                    result.push('<'+element.tag+tagClassAttr+'>'+"\n"+paragraphContent+'</'+element.tag+'>');
                    inParagraph = false;
                    paragraphContent = '';
                }
                continue;
            }
            if(!lines[i].startsWith('<')){
                if(!inParagraph){
                    inParagraph = true;
                    paragraphContent = lines[i];
                    continue;
                }
                paragraphContent += '<br/>'+ "\n" + lines[i];
                continue;
            }
            if(inParagraph){
                result.push('<'+element.tag+tagClassAttr+'>'+paragraphContent+'</'+element.tag+'>');
                inParagraph = false;
                paragraphContent = '';
            }
            result.push(lines[i]);
        }
        if(inParagraph){
            result.push('<'+element.tag+tagClassAttr+'>'+paragraphContent+'</'+element.tag+'>');
        }
        return result.join('\n');
    }

    replaceMarkdown(text, regex, markdownKey, replacement)
    {
        let useReplacement = 'function' === typeof replacement;
        if(this.hasOwn(this.transformers, markdownKey)){
            return text.replace(regex, (match, ...args) => {
                return this.transformers[markdownKey]({
                    markdown: match,
                    html: (useReplacement ? replacement(match, ...args) : match.replace(regex, replacement))
                });
            });
        }
        return text.replace(regex, (match, ...args) => {
            return useReplacement ? replacement(match, ...args) : match.replace(regex, replacement);
        });
    }

    isValidHtml(html)
    {
        let stack = [];
        let tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
        let matches = html.match(tagPattern) || [];
        for(let i = 0; i < matches.length; i++){
            let tag = matches[i];
            let tagMatches = tag.match(/<\/?([a-z][a-z0-9]*)\b[^>]*/i);
            let tagName = tagMatches[1].toLowerCase();
            let isSelfClosing = this.checkSelfClosingTag(tag, tagName);
            if(isSelfClosing){
                continue;
            }
            let isClosingTag = 0 === tag.indexOf('</');
            let validTagPair = this.isValidTagPair(stack, tagName, isClosingTag);
            if(!validTagPair){
                return false;
            }
        }
        return 0 === stack.length;
    }

    checkSelfClosingTag(tag, tagName)
    {
        return 0 < tag.indexOf('/>') || ['img', 'br', 'hr', 'input'].includes(tagName);
    }

    isValidTagPair(stack, tagName, isClosingTag)
    {
        if(!isClosingTag){
            stack.push(tagName);
            return true;
        }
        if(0 === stack.length){
            return false;
        }
        return stack.pop() === tagName;
    }

    sanitizeHtml(html)
    {
        return html.replace(/<([^>]*)>/g, (match) => {
            return match.match(/<\/?\s*([a-z][a-z0-9]*)\b[^>]*>/i) ? match : this.sanitize(match);
        });
    }

    hasOwn(obj, prop)
    {
        return obj && {}.hasOwnProperty.call(obj, prop) && 'undefined' !== typeof obj[prop];
    }

    get(obj, prop, defaultReturn)
    {
        return this.hasOwn(obj, prop) ? obj[prop] : defaultReturn;
    }

    sanitize(input)
    {
        if(!input){
            return '';
        }
        return input
            .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#x60;');
    }

}

module.exports = MarkdownToHTML;
