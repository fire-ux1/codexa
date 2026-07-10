import io
import pyotp
import qrcode
import qrcode.image.svg
import base64


def generate_mfa_setup(email: str) -> tuple[str, str]:
    """
    Generates a new TOTP secret and a base64-encoded SVG QR code.
    Returns:
        (secret_key, base64_svg_qr_code)
    """
    secret = pyotp.random_base32()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email, issuer_name="CodePilot AI"
    )

    # Generate Svg Image
    factory = qrcode.image.svg.SvgImage
    img = qrcode.make(uri, image_factory=factory)

    svg_io = io.BytesIO()
    img.save(svg_io)
    svg_bytes = svg_io.getvalue()

    # Encode base64
    base64_svg = base64.b64encode(svg_bytes).decode("utf-8")
    qr_data_url = f"data:image/svg+xml;base64,{base64_svg}"

    return secret, qr_data_url


def verify_totp_code(secret: str, code: str) -> bool:
    """Verifies a 6-digit TOTP code using the user's secret key."""
    if not secret or not code:
        return False

    # Strip spaces
    code_clean = code.replace(" ", "").replace("-", "")
    totp = pyotp.TOTP(secret)

    # We allow a small clock drift tolerance window of 1 interval (30 seconds)
    return totp.verify(code_clean, valid_window=1)
