from werkzeug.security import generate_password_hash, check_password_hash

def set_password_hash(password):
    """Gera o hash da senha para armazenamento."""
    return generate_password_hash(password)

def check_password(password, hash):
    """Verifica se a senha corresponde ao hash armazenado."""
    return check_password_hash(hash, password)

