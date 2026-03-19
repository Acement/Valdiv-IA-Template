## Formato de los datos en mongoDB:

### Locales

```python3
{
"tipo"          : "local",          # Tipo de elemento
"nombre_local"  : name,             # Nombre del local
"calle"         : street,           # Direccion del local
"tipo_local"    : type_org,         # Tipo de local
"dias"          : days,             # Dias en los que atiende
"apertura"      : opening,          # Hora de apertura, formato 24Hrs
"cierre"        : closing,          # Hora de cierre, formato 24Hrs
"links"         : link,             # Links del local
"descripcion"   : description,      # Descripcion breve del local
"update"        : str(date_update)  # Marca de tiempo en la que se subio o modifico el local
}
```
### Eventos
```python3
{
"tipo"          : "evento",        # Tipo de elemento
"nombre_evento" : name,            # Nombre del evento
"lugar"         : street,          # Direccion del evento
"Fechas"        : days,            # Dias del evento
"apertura"      : opening,         # Hora de apertura, formato 24Hrs, si es aplicable
"cierre"        : closing,         # Hora de cierre, formato 24Hrs, se es aplicable
"links"         : link,            # Links del evento
"descripcion"   : description,     # Descripcion breve del evento
"update"        : str(date_update) # Marca de tiempo en la que se subio o modifico el local
}
```
## Programa para interactuar con la base de datos de locales y eventos

**local_event_op.py**

### Requerimientos:

- Python3
- pymongo
- requests

### Funciones:

- **spacing()**: Imprime un separador como ayuda visual.
- **connect_mongo()**: Se conecta a la base de datos en mongoDB usando el cliente oficial en python
- **check_opt_yn(message)**: Imprime una opcion para decir si o no y chequea si se ingreso la opcion correcta
  - message: Es un string con el cual se mostrara la pregunta
- **ping_http(url, timeout=5)**: Se usa para verificar si la pagina subida es una pagina real y esta funcionando
  - url: Link a la pagina que se quiere checkear
- **upload_mod(data,collection_name)**: Funcion para subir la modificacion a la base de datos, ya sea un evento o un local
  - data: Diccionario de python en el que se tiene todos los datos del evento o el local
  - collection_name: Nombre de la coleccion dentro de mongo que se quiere guardar, tiene dos opciones:
    - 'Locales'
    - 'Eventos'
- **add_place(data_local)**: Sube un local nuevo a la base de datos en mongoDB
  - data_local: Diccionario de python que se guarda la base de datos, contiene los datos del local
- **mod_place(name)**: Modifica un local, hace uso de la funcion **upload_mod** para subir los datos
  - name: nombre del local que se buscara en la base de datos
- **add_event(data_evento)**: Sube un evento a la base de datos
  - data_evento: Diccionario de python que se guarda la base de datos, contiene los datos del evento
- **mod_event(name)**: Modifica un evento, hace uso de la funcion **upload_mod** para subir los datos
  - name: nombre del evento que se buscara en la base de datos
- **print_all()**: Imprime todos los elementos en la base de datos
- **print_all_places()**: Imprime todos los locales
- **print_place(name)**: Imprime todas las instancias de un local en la base de datos
  - name: Nombre del local
- **print_all_events()**: Imprime todos los eventos en la base de datos
- **print_event(name)**: Imprime todas las instancias de un evento en la base de datos
  - name: Nombre del evento
- **delete_all()**: Borra todos los elementos en la base de datos
- **delete_all_places()**: Borra todos los locales en la base de datos
- **delete_place(name)**: Borra todas las instancias de un local en la base de datos
  - name: nombre del local
- **delete_all_events()**: Borra todos los eventos de la base de datos
- **delete_event(name)**: Borra todas las instancias de un evento de la base de datos
  - name: nombre del evento
