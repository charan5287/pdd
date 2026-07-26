import os
import configparser

class Config:
    def __init__(self, config_path=None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'test_config.ini')
        
        self.config = configparser.ConfigParser()
        if os.path.exists(config_path):
            self.config.read(config_path)
            
    @property
    def base_url(self) -> str:
        url = os.getenv('BASE_URL') or self.config.get('DEFAULT', 'BASE_URL', fallback='https://charan5287.github.io/pdd/')
        if not url.endswith('/'):
            url += '/'
        return url

    @property
    def browser(self) -> str:
        return os.getenv('BROWSER') or self.config.get('DEFAULT', 'BROWSER', fallback='chrome')

    @property
    def headless(self) -> bool:
        val = os.getenv('HEADLESS')
        if val is not None:
            return val.lower() in ['true', '1', 'yes']
        return self.config.getboolean('DEFAULT', 'HEADLESS', fallback=True)

    @property
    def implicit_wait(self) -> int:
        return int(os.getenv('IMPLICIT_WAIT') or self.config.getint('DEFAULT', 'IMPLICIT_WAIT', fallback=10))

    @property
    def explicit_wait(self) -> int:
        return int(os.getenv('EXPLICIT_WAIT') or self.config.getint('DEFAULT', 'EXPLICIT_WAIT', fallback=15))

    @property
    def page_load_timeout(self) -> int:
        return int(os.getenv('PAGE_LOAD_TIMEOUT') or self.config.getint('DEFAULT', 'PAGE_LOAD_TIMEOUT', fallback=30))

    @property
    def screenshot_on_failure(self) -> bool:
        return self.config.getboolean('DEFAULT', 'SCREENSHOT_ON_FAILURE', fallback=True)

    @property
    def log_level(self) -> str:
        return os.getenv('LOG_LEVEL') or self.config.get('DEFAULT', 'LOG_LEVEL', fallback='INFO')

    @property
    def retry_count(self) -> int:
        return int(os.getenv('RETRY_COUNT') or self.config.getint('DEFAULT', 'RETRY_COUNT', fallback=2))

    @property
    def critical_pass_threshold(self) -> float:
        return float(os.getenv('CRITICAL_PASS_THRESHOLD') or self.config.getfloat('DEFAULT', 'CRITICAL_PASS_THRESHOLD', fallback=95.0))

config = Config()
