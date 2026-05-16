from datetime import datetime, timedelta

from jose import JWTError, jwt

from passlib.context import CryptContext

from fastapi import Depends, HTTPException, status

from fastapi.security import OAuth2PasswordBearer

# =========================
# CONFIG
# =========================

SECRET_KEY = "4b4b9c18c5e24e8c9e8f3c8d9b1e6f"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_HOURS = 8

# =========================
# PASSWORD HASH
# =========================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# =========================
# OAUTH2
# =========================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)

# =========================
# USUÁRIO MVP
# =========================

fake_user = {

    "username": "ti",

    # senha: 
    "hashed_password": pwd_context.hash("cpd@123")

}

# =========================
# VERIFY PASSWORD
# =========================

def verify_password(
    plain_password,
    hashed_password
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )

# =========================
# AUTH USER
# =========================

def authenticate_user(
    username,
    password
):

    if username != fake_user["username"]:

        return False

    if not verify_password(
        password,
        fake_user["hashed_password"]
    ):

        return False

    return fake_user

# =========================
# CREATE TOKEN
# =========================

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        hours=ACCESS_TOKEN_EXPIRE_HOURS
    )

    to_encode.update({

        "exp": expire

    })

    encoded_jwt = jwt.encode(

        to_encode,

        SECRET_KEY,

        algorithm=ALGORITHM

    )

    return encoded_jwt

# =========================
# GET CURRENT USER
# =========================

def get_current_user(

    token: str = Depends(oauth2_scheme)

):

    credentials_exception = HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Credenciais inválidas",

        headers={"WWW-Authenticate": "Bearer"}

    )

    try:

        payload = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )

        username = payload.get("sub")

        if username is None:

            raise credentials_exception

    except JWTError:

        raise credentials_exception

    return {

        "username": username

    }