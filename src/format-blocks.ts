import jsdom from 'jsdom'
import { SupportedLang } from '.'

export const formatImgSrc = (htmlString: string, baseUrl: string) => {
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

export const formatSitenameBlock = (htmlString: string, selector: string, sitename: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const sitenameLink = document.querySelector(selector)
  if (sitenameLink) sitenameLink.textContent = sitename
  const modifiedHtmlString = document.body.innerHTML
  return modifiedHtmlString
}

export const formatLocaleLinkBlock = (
  htmlString: string,
  selector: string,
  localeText: string,
  linkUrl: string,
  lang: SupportedLang
) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const localeLink = document.querySelector(selector) as HTMLAnchorElement
  const url = new URL(linkUrl)
  url.searchParams.set('l', lang === 'en' ? 'sv' : 'en')
  if (localeLink) {
    localeLink.textContent = localeText
    localeLink.href = url.toString()
  }
  const modifiedHtmlString = document.body.innerHTML
  return modifiedHtmlString
}
