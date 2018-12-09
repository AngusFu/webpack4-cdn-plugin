import logo from './logo.png'

export default function bar () {
  console.log('bar...')
  const img = new window.Image()
  img.src = logo
  document.body.appendChild(img)
}
