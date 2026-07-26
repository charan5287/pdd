import sys
import os
import requests
from automation.utils.config import config
from automation.utils.logger import logger

def verify_deployment(url: str = None) -> bool:
    if not url:
        url = config.base_url

    logger.info(f"Verifying live deployment at URL: {url}")
    
    # 1. HTTP status code check
    try:
        response = requests.get(url, timeout=15)
        logger.info(f"Main Page HTTP Status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Deployment Verification FAILED! Returned HTTP {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Deployment Health Check Connection Error: {e}")
        return False

    content = response.text
    if len(content) < 50 or "html" not in content.lower():
        logger.error("Deployment Verification FAILED! Main page content is empty or invalid HTML.")
        return False

    logger.info("Main HTML content retrieved successfully.")
    
    # 2. Asset loading check (Extract stylesheet and script tags)
    import re
    css_files = re.findall(r'href=["\']([^"\']+\.css[^"\']*)["\']', content)
    js_files = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', content)

    logger.info(f"Extracted {len(css_files)} CSS asset(s) and {len(js_files)} JS asset(s)")

    # Test loading assets
    from urllib.parse import urljoin
    for css in css_files[:3]:
        asset_url = urljoin(url, css)
        try:
            r = requests.head(asset_url, timeout=5)
            if r.status_code == 200 or r.status_code == 304:
                logger.info(f"CSS asset verified [200 OK]: {asset_url}")
            else:
                logger.warning(f"CSS asset returned HTTP {r.status_code}: {asset_url}")
        except Exception as e:
            logger.warning(f"CSS asset fetch exception ({asset_url}): {e}")

    for js in js_files[:3]:
        asset_url = urljoin(url, js)
        try:
            r = requests.head(asset_url, timeout=5)
            if r.status_code == 200 or r.status_code == 304:
                logger.info(f"JS asset verified [200 OK]: {asset_url}")
            else:
                logger.warning(f"JS asset returned HTTP {r.status_code}: {asset_url}")
        except Exception as e:
            logger.warning(f"JS asset fetch exception ({asset_url}): {e}")

    logger.info("SUCCESS: Live deployment verification completed successfully.")
    return True

if __name__ == '__main__':
    target_url = sys.argv[1] if len(sys.argv) > 1 else config.base_url
    success = verify_deployment(target_url)
    if not success:
        sys.exit(1)
    sys.exit(0)
