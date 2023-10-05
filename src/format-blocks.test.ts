import { formatImgSrc, formatSitenameBlock, formatLocaleLinkBlock } from './format-blocks'
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

describe('formatSitenameBlock', () => {
  it('should replace the text content of the selected siteBlock element with provided sitename', () => {
    const htmlString = '<html><body><div id="sitename">Old Text</div></body></html>'
    const selector = '#sitename'
    const sitename = 'New Sitename'

    const formattedHtml = formatSitenameBlock(htmlString, selector, sitename)

    const { window } = new jsdom.JSDOM(formattedHtml)
    const document = window.document
    const sitenameElement = document.querySelector(selector) as Element

    expect(sitenameElement.textContent).toBe(sitename)
  })
})

describe('formatLocaleLinkBlock', () => {
  it('should replace the text content and href of the selected anchor element with  provided localeText and linkUrl', () => {
    const htmlString = '<html><body><a id="locale-link" href="/page?l=en">English</a></body></html>'
    const selector = '#locale-link'
    const localeText = 'Svenska'
    const linkUrl = 'http://example.com/page?l=en'

    const formattedHtml = formatLocaleLinkBlock(htmlString, selector, localeText, linkUrl)

    const { window } = new jsdom.JSDOM(formattedHtml)
    const document = window.document

    const localeLink = document.querySelector(selector) as HTMLAnchorElement

    expect(localeLink.textContent).toBe(localeText)

    expect(localeLink.href).toBe(linkUrl.replace('en', 'sv'))
  })
})
