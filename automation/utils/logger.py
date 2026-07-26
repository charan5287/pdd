import logging
import os
import sys
from datetime import datetime

class Logger:
    _logger = None

    @staticmethod
    def get_logger(name: str = "SeleniumAutomation") -> logging.Logger:
        if Logger._logger is not None:
            return Logger._logger

        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            # File handler
            logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
            os.makedirs(logs_dir, exist_ok=True)
            log_file = os.path.join(logs_dir, f"execution_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
            
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(logging.INFO)

            # Console handler
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)

            # Formatter
            formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)

            logger.addHandler(file_handler)
            logger.addHandler(console_handler)

        Logger._logger = logger
        return logger

logger = Logger.get_logger()
