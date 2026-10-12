// Display identity only. Persisted IDs, storage keys and backup paths stay compatible.
export const APP_NAME = 'AliLab Training'
export const PRODUCT_URL = 'https://training.alilab.ir/'
export const REPO_URL = 'https://github.com/Nsport441/alilab-training'

// Keep the existing locale keys and translations. Apply before interpolation so a user's
// name or routine called "openGym" is never renamed. Legacy paths such as Documents/openGym
// and URLs identify real resources, rather than the product's display name.
export const productText = text => text.replace(/(?<![/\\])\bopenGym\b/g, APP_NAME)

// This fork currently distributes the web/PWA build. An upstream APK is a different app.
export const NATIVE_RELEASES = false
