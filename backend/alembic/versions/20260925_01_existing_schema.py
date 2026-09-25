"""Baseline del esquema existente autoscan_motors, inspeccionado el 25-09-2026.

Las 14 tablas ya existen. Esta revisión no recrea ni elimina datos.
Registrar con app.scripts.baseline, que verifica primero su correspondencia.
"""

revision = "20260925_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    raise RuntimeError("La baseline representa tablas preexistentes y no admite borrado automático.")
