[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens - Markdown

### Features

- Markdown to HTML conversion, easy to use:
```
const { MarkdownToHTML } = require('@reldens/markdown');
const markdownToHTML = new MarkdownToHTML();
const htmlContent = markdownToHTML.transform(mdContent);
```
- Custom transformation callbacks support:
```
const markdownToHTML = new MarkdownToHTML({
    classes: {
        p: 'custom-text-class'
    }
});
// will out put: 
// <p class="custom-text-class">your content</p>
```
- Custom classes per element support:
```
const markdownToHTML = new MarkdownToHTML({
    transformers: {
        p: (data) => {
            // data.markdown will contain the matching content
            // data.html will contain the default transformed content
            return '<p data-custom-attribute="you can do whatever you like">'+data.markdown+'</p>';           
        }
    }
});
// will out put: 
// <p data-custom-attribute="you can do whatever you like">your content</p>
```


Need something specific?

[Request a feature here: https://www.reldens.com/features-request](https://www.reldens.com/features-request)

---

## Documentation

[https://www.reldens.com/documentation/markdown/](https://www.reldens.com/documentation/markdown/)


---

### [Reldens](https://github.com/damian-pastorini/reldens/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
