import argparse
import getpass
import sys

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.schemas.auth import RegisterRequest
from app.users import create_user


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an administrator account.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--language", default="ru", help="kk, ru or en")
    args = parser.parse_args()

    # Asked interactively, so the password never ends up in shell history.
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        sys.exit("Passwords do not match.")

    # Same rules as public registration.
    try:
        data = RegisterRequest(
            email=args.email, password=password, name=args.name, language=args.language
        )
    except ValidationError as error:
        # include_input=False keeps the password out of the message.
        problems = error.errors(include_input=False)
        sys.exit("\n".join(f"{p['loc'][0]}: {p['msg']}" for p in problems))

    with SessionLocal() as db:
        try:
            user = create_user(
                db, data.email, data.password, data.name, data.language, role="admin"
            )
            db.commit()
        except IntegrityError:
            sys.exit(f"User {data.email} already exists.")
        print(f"Admin {user.email} created, id {user.id}.")


if __name__ == "__main__":
    main()
