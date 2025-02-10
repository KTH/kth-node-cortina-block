import jsdom from 'jsdom'

export const formatImgSrc = (htmlString: string, baseUrl: string) => {
  if (htmlString.includes('<script')) return htmlString
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const imgElements = document.querySelectorAll('img')
  imgElements.forEach((imgElement: HTMLImageElement) => {
    const currentSrc = imgElement.getAttribute('src')
    if (currentSrc) {
      imgElement.setAttribute('src', baseUrl + currentSrc)
    }
  })
  const modifiedHtmlString = document.body.innerHTML
  return modifiedHtmlString
}
