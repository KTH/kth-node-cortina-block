import { formatImgSrc } from './format-blocks'
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
