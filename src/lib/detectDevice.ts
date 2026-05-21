export interface DeviceInfo {
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isStandalone: boolean
  isMobile: boolean
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone: boolean }).standalone === true)
  )
}

export function getDeviceInfo(): DeviceInfo {
  return {
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isSafari: isSafari(),
    isStandalone: isInStandaloneMode(),
    isMobile: isIOS() || isAndroid(),
  }
}
