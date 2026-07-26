import time
import functools
from automation.utils.logger import logger
from automation.utils.config import config

def retry_on_failure(max_retries: int = None, delay: float = 1.0):
    if max_retries is None:
        max_retries = config.retry_count

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts <= max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts > max_retries:
                        logger.error(f"Function '{func.__name__}' failed after {max_retries} retries: {e}")
                        raise e
                    logger.warning(f"Retrying '{func.__name__}' (Attempt {attempts}/{max_retries}) due to: {e}")
                    time.sleep(delay)
        return wrapper
    return decorator
