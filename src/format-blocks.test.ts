import { formatImgSrc, formatLocaleLinkBlock } from './format-blocks'
import jsdom from 'jsdom'

describe('formatImgSrc', () => {
  it('should add a base URL to the src attribute of img elements in the HTML string', () => {
    const htmlString = `
        <html>
          <body>
            <img src="image1.jpg" />
            <img src="image2.jpg" />
          </body>
        </html>
      `
    const baseUrl = 'https://example.com/'
    const modifiedHtmlString = formatImgSrc(htmlString, baseUrl)

    const { window } = new jsdom.JSDOM(modifiedHtmlString)
    const imgElements = window.document.querySelectorAll('img')

    expect(imgElements[0].getAttribute('src')).toBe(baseUrl + 'image1.jpg')
    expect(imgElements[1].getAttribute('src')).toBe(baseUrl + 'image2.jpg')
  })
})

it('should not format a block containing script tags', () => {
  const htmlString = `
  <script>
    console.log("Hello world")
  </script>
  `
  const notModifiedHtmlString = formatImgSrc(htmlString, '')
  expect(notModifiedHtmlString).toEqual(htmlString)
})

describe('formatLocaleLinkBlock', () => {
  it('should replace the text content and href of the selected anchor element with  provided localeText and linkUrl', () => {
    const htmlString = '<html><body><a id="locale-link" href="/page?l=en">English</a></body></html>'
    const selector = '#locale-link'
    const localeText = 'Svenska'
    const linkUrl = 'http://example.com/page?l=en'
    const lang = 'en'

    const formattedHtml = formatLocaleLinkBlock(htmlString, selector, localeText, linkUrl, lang)

    const { window } = new jsdom.JSDOM(formattedHtml)
    const document = window.document

    const localeLink = document.querySelector(selector) as HTMLAnchorElement

    expect(localeLink.textContent).toBe(localeText)

    expect(localeLink.href).toBe(linkUrl.replace('en', 'sv'))
  })
})
