import logging
import os

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    logging.getLogger(__name__).info("Hello from my_project (env=%s)", os.getenv("APP_ENV"))


if __name__ == "__main__":
    main()
