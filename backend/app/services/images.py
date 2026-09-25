from io import BytesIO
from pathlib import Path
from uuid import uuid4
import warnings

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.config import settings

FORMATS = {'JPEG': ('image/jpeg', {'.jpg', '.jpeg'}, '.jpg'), 'PNG': ('image/png', {'.png'}, '.png'), 'WEBP': ('image/webp', {'.webp'}, '.webp')}


def validate_image(data: bytes, mime: str, filename: str) -> str:
    if not data or len(data) > settings.upload_max_mb * 1024 * 1024:
        raise HTTPException(413, f'La imagen debe ocupar como máximo {settings.upload_max_mb} MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as picture:
                format_name = picture.format
                if picture.width * picture.height > 36_000_000:
                    raise HTTPException(422, 'La imagen supera la resolución admitida.')
                picture.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'El archivo no contiene una imagen válida.') from None
    expected = FORMATS.get(format_name)
    if not expected or mime != expected[0] or Path(filename).suffix.lower() not in expected[1]:
        raise HTTPException(422, 'El contenido, la extensión y el tipo de imagen deben coincidir (JPG, PNG o WebP).')
    return expected[2]


def store_image(file: UploadFile, vehicle_id: int) -> tuple[str, Path, str]:
    data = file.file.read(settings.upload_max_mb * 1024 * 1024 + 1)
    original = (file.filename or 'imagen').replace('\\', '/').rsplit('/', 1)[-1][:255]
    extension = validate_image(data, file.content_type or '', original)
    root = (settings.storage_dir / 'vehiculos').resolve()
    directory = (root / str(vehicle_id)).resolve()
    if not directory.is_relative_to(root):
        raise HTTPException(422, 'Destino de imagen inválido.')
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / (uuid4().hex + extension)
    path.write_bytes(data)
    return f'/media/vehiculos/{vehicle_id}/{path.name}', path, original
