"""Modelos del esquema MySQL inspeccionado el 25-09-2026. Sin reflexi?n al arrancar."""

from sqlalchemy import Column, CheckConstraint, ForeignKeyConstraint, Index, text
from sqlalchemy.dialects.mysql import BIGINT, INTEGER, TINYINT, SMALLINT, VARCHAR, CHAR, TEXT, DECIMAL, ENUM, TIMESTAMP, DATETIME
from app.database import Base


class Rol(Base):
    __tablename__ = 'roles'
    id = Column(TINYINT(unsigned=True), nullable=False, primary_key=True, autoincrement=False)
    nombre = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=False)
    descripcion = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        Index('nombre', 'nombre', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Usuario(Base):
    __tablename__ = 'usuarios'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    nombre = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=False)
    apellido = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=True)
    email = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=180), nullable=False)
    password_hash = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=False)
    telefono = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    documento = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    role_id = Column(TINYINT(unsigned=True), nullable=False, server_default=text("'1'"))
    activo = Column(TINYINT(display_width=1), nullable=False, server_default=text("'1'"))
    email_verificado = Column(TINYINT(display_width=1), nullable=False, server_default=text("'0'"))
    debe_cambiar_password = Column(TINYINT(display_width=1), nullable=False, server_default=text("'0'"))
    token_version = Column(INTEGER(unsigned=True), nullable=False, server_default=text("'0'"))
    ultimo_acceso = Column(DATETIME(), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['role_id'], ['roles.id'], name='fk_usuario_role', onupdate='CASCADE', ondelete='RESTRICT'),
        Index('documento', 'documento', unique=True),
        Index('email', 'email', unique=True),
        Index('idx_usuarios_activo', 'activo', unique=False),
        Index('idx_usuarios_email', 'email', unique=False),
        Index('idx_usuarios_role', 'role_id', unique=False),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Cars196Clase(Base):
    __tablename__ = 'cars196_clases'
    id = Column(SMALLINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    class_index = Column(SMALLINT(unsigned=True), nullable=True)
    label = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=False)
    marca = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=True)
    modelo = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=150), nullable=True)
    anio = Column(SMALLINT(unsigned=True), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        CheckConstraint('((`anio` is null) or ((`anio` >= 1886) and (`anio` <= 2012)))', name='chk_cars196_anio'),
        Index('class_index', 'class_index', unique=True),
        Index('idx_cars196_marca', 'marca', unique=False),
        Index('idx_cars196_modelo', 'modelo', unique=False),
        Index('label', 'label', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Vehiculo(Base):
    __tablename__ = 'vehiculos'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    codigo = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=False)
    vin = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=50), nullable=True)
    cars196_clase_id = Column(SMALLINT(unsigned=True), nullable=True)
    marca = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=False)
    modelo = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=150), nullable=False)
    version = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=150), nullable=True)
    anio = Column(SMALLINT(unsigned=True), nullable=False)
    precio = Column(DECIMAL(precision=12, scale=2), nullable=False)
    kilometraje = Column(INTEGER(unsigned=True), nullable=False, server_default=text("'0'"))
    combustible = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=50), nullable=True)
    transmision = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=50), nullable=True)
    color = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=60), nullable=True)
    motor = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=True)
    categoria = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=80), nullable=True)
    descripcion = Column(TEXT(collation='utf8mb4_unicode_ci'), nullable=True)
    estado = Column(ENUM('disponible', 'reservado', 'vendido', 'mantenimiento', 'oculto', collation='utf8mb4_unicode_ci'), nullable=False, server_default=text("'disponible'"))
    destacado = Column(TINYINT(display_width=1), nullable=False, server_default=text("'0'"))
    imagen_principal = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=True)
    datos_demo = Column(TINYINT(display_width=1), nullable=False, server_default=text("'0'"))
    activo = Column(TINYINT(display_width=1), nullable=False, server_default=text("'1'"))
    creado_por = Column(BIGINT(unsigned=True), nullable=True)
    actualizado_por = Column(BIGINT(unsigned=True), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['actualizado_por'], ['usuarios.id'], name='fk_vehiculo_actualizado_por', ondelete='SET NULL'),
        ForeignKeyConstraint(['cars196_clase_id'], ['cars196_clases.id'], name='fk_vehiculo_cars196', onupdate='CASCADE', ondelete='SET NULL'),
        ForeignKeyConstraint(['creado_por'], ['usuarios.id'], name='fk_vehiculo_creado_por', ondelete='SET NULL'),
        CheckConstraint('((`anio` >= 1886) and (`anio` <= 2012))', name='chk_vehiculo_anio'),
        CheckConstraint('(`kilometraje` >= 0)', name='chk_vehiculo_kilometraje'),
        CheckConstraint('(`precio` >= 0)', name='chk_vehiculo_precio'),
        Index('codigo', 'codigo', unique=True),
        Index('fk_vehiculo_actualizado_por', 'actualizado_por', unique=False),
        Index('fk_vehiculo_cars196', 'cars196_clase_id', unique=False),
        Index('idx_vehiculos_anio', 'anio', unique=False),
        Index('idx_vehiculos_categoria', 'categoria', unique=False),
        Index('idx_vehiculos_creado_por', 'creado_por', unique=False),
        Index('idx_vehiculos_estado', 'estado', unique=False),
        Index('idx_vehiculos_marca', 'marca', unique=False),
        Index('idx_vehiculos_modelo', 'modelo', unique=False),
        Index('idx_vehiculos_precio', 'precio', unique=False),
        Index('vin', 'vin', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class VehiculoImagen(Base):
    __tablename__ = 'vehiculo_imagenes'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=False)
    ruta = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=False)
    nombre_original = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=True)
    alt_text = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=True)
    orden = Column(SMALLINT(unsigned=True), nullable=False, server_default=text("'0'"))
    es_principal = Column(TINYINT(display_width=1), nullable=False, server_default=text("'0'"))
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_imagen_vehiculo', ondelete='CASCADE'),
        Index('idx_imagenes_vehiculo', 'vehiculo_id', unique=False),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class VehiculoCaracteristica(Base):
    __tablename__ = 'vehiculo_caracteristicas'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=False)
    caracteristica = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_caracteristica_vehiculo', ondelete='CASCADE'),
        Index('idx_caracteristicas_vehiculo', 'vehiculo_id', unique=False),
        Index('uq_vehiculo_caracteristica', 'vehiculo_id', 'caracteristica', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Favorito(Base):
    __tablename__ = 'favoritos'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    usuario_id = Column(BIGINT(unsigned=True), nullable=False)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name='fk_favorito_usuario', ondelete='CASCADE'),
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_favorito_vehiculo', ondelete='CASCADE'),
        Index('fk_favorito_vehiculo', 'vehiculo_id', unique=False),
        Index('idx_favoritos_usuario', 'usuario_id', unique=False),
        Index('uq_favorito', 'usuario_id', 'vehiculo_id', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Turno(Base):
    __tablename__ = 'turnos'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    cliente_id = Column(BIGINT(unsigned=True), nullable=False)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=False)
    vendedor_id = Column(BIGINT(unsigned=True), nullable=True)
    fecha_inicio = Column(DATETIME(), nullable=False)
    fecha_fin = Column(DATETIME(), nullable=False)
    estado = Column(ENUM('pendiente', 'confirmado', 'atendido', 'cancelado', 'no_asistio', collation='utf8mb4_unicode_ci'), nullable=False, server_default=text("'pendiente'"))
    notas_cliente = Column(TEXT(collation='utf8mb4_unicode_ci'), nullable=True)
    notas_internas = Column(TEXT(collation='utf8mb4_unicode_ci'), nullable=True)
    motivo_cancelacion = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['usuarios.id'], name='fk_turno_cliente', ondelete='RESTRICT'),
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_turno_vehiculo', ondelete='RESTRICT'),
        ForeignKeyConstraint(['vendedor_id'], ['usuarios.id'], name='fk_turno_vendedor', ondelete='SET NULL'),
        CheckConstraint('(`fecha_fin` > `fecha_inicio`)', name='chk_turno_fechas'),
        Index('idx_turnos_cliente', 'cliente_id', unique=False),
        Index('idx_turnos_estado', 'estado', unique=False),
        Index('idx_turnos_vehiculo_fecha', 'vehiculo_id', 'fecha_inicio', 'fecha_fin', unique=False),
        Index('idx_turnos_vendedor_fecha', 'vendedor_id', 'fecha_inicio', 'fecha_fin', unique=False),
        Index('uq_turno_cliente_vehiculo_inicio', 'cliente_id', 'vehiculo_id', 'fecha_inicio', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Carrito(Base):
    __tablename__ = 'carritos'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    usuario_id = Column(BIGINT(unsigned=True), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name='fk_carrito_usuario', ondelete='CASCADE'),
        Index('usuario_id', 'usuario_id', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class CarritoItem(Base):
    __tablename__ = 'carrito_items'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    carrito_id = Column(BIGINT(unsigned=True), nullable=False)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['carrito_id'], ['carritos.id'], name='fk_carrito_item_carrito', ondelete='CASCADE'),
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_carrito_item_vehiculo', ondelete='CASCADE'),
        Index('fk_carrito_item_vehiculo', 'vehiculo_id', unique=False),
        Index('idx_carrito_items_carrito', 'carrito_id', unique=False),
        Index('uq_carrito_vehiculo', 'carrito_id', 'vehiculo_id', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Orden(Base):
    __tablename__ = 'ordenes'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    numero_orden = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=50), nullable=False)
    usuario_id = Column(BIGINT(unsigned=True), nullable=False)
    nombre_cliente = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=200), nullable=False)
    documento_cliente = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    email_cliente = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=180), nullable=False)
    telefono_cliente = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    direccion_cliente = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=True)
    subtotal = Column(DECIMAL(precision=12, scale=2), nullable=False)
    total = Column(DECIMAL(precision=12, scale=2), nullable=False)
    moneda = Column(CHAR(collation='utf8mb4_unicode_ci', length=3), nullable=False, server_default=text("'USD'"))
    estado = Column(ENUM('pendiente', 'procesando', 'completada', 'cancelada', collation='utf8mb4_unicode_ci'), nullable=False, server_default=text("'pendiente'"))
    estado_pago = Column(ENUM('pendiente', 'simulado_aprobado', 'simulado_rechazado', collation='utf8mb4_unicode_ci'), nullable=False, server_default=text("'pendiente'"))
    pago_marca_tarjeta = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    pago_ultimos_4 = Column(CHAR(collation='utf8mb4_unicode_ci', length=4), nullable=True)
    pago_referencia = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name='fk_orden_usuario', ondelete='RESTRICT'),
        CheckConstraint('(`subtotal` >= 0)', name='chk_orden_subtotal'),
        CheckConstraint('(`total` >= 0)', name='chk_orden_total'),
        Index('idx_ordenes_estado', 'estado', unique=False),
        Index('idx_ordenes_fecha', 'created_at', unique=False),
        Index('idx_ordenes_pago', 'estado_pago', unique=False),
        Index('idx_ordenes_usuario', 'usuario_id', unique=False),
        Index('numero_orden', 'numero_orden', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class OrdenItem(Base):
    __tablename__ = 'orden_items'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    orden_id = Column(BIGINT(unsigned=True), nullable=False)
    vehiculo_id = Column(BIGINT(unsigned=True), nullable=True)
    codigo_vehiculo = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=30), nullable=True)
    marca = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=False)
    modelo = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=150), nullable=False)
    version = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=150), nullable=True)
    anio = Column(SMALLINT(unsigned=True), nullable=False)
    kilometraje = Column(INTEGER(unsigned=True), nullable=True)
    precio = Column(DECIMAL(precision=12, scale=2), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['orden_id'], ['ordenes.id'], name='fk_orden_item_orden', ondelete='CASCADE'),
        ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], name='fk_orden_item_vehiculo', ondelete='SET NULL'),
        CheckConstraint('((`anio` >= 1886) and (`anio` <= 2012))', name='chk_orden_item_anio'),
        CheckConstraint('(`precio` >= 0)', name='chk_orden_item_precio'),
        Index('fk_orden_item_vehiculo', 'vehiculo_id', unique=False),
        Index('idx_orden_items_orden', 'orden_id', unique=False),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Factura(Base):
    __tablename__ = 'facturas'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    orden_id = Column(BIGINT(unsigned=True), nullable=False)
    numero_factura = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=50), nullable=False)
    archivo_pdf = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=True)
    email_destino = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=180), nullable=False)
    estado_email = Column(ENUM('pendiente', 'enviado', 'error', collation='utf8mb4_unicode_ci'), nullable=False, server_default=text("'pendiente'"))
    enviada_at = Column(DATETIME(), nullable=True)
    error_email = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=True)
    created_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        ForeignKeyConstraint(['orden_id'], ['ordenes.id'], name='fk_factura_orden', ondelete='RESTRICT'),
        Index('idx_factura_email_estado', 'estado_email', unique=False),
        Index('idx_factura_numero', 'numero_factura', unique=False),
        Index('numero_factura', 'numero_factura', unique=True),
        Index('orden_id', 'orden_id', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )

class Configuracion(Base):
    __tablename__ = 'configuracion'
    id = Column(BIGINT(unsigned=True), nullable=False, primary_key=True, autoincrement=True)
    clave = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=100), nullable=False)
    valor = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=500), nullable=False)
    descripcion = Column(VARCHAR(collation='utf8mb4_unicode_ci', length=255), nullable=True)
    updated_at = Column(TIMESTAMP(), nullable=False, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    __table_args__ = (
        Index('clave', 'clave', unique=True),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )
