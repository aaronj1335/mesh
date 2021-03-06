FIELD_PARAMETERS = ('readonly', 'deferred', 'sortable', 'operators')
RETURNING = 'returning'

DELETE = 'DELETE'
GET = 'GET'
HEAD = 'HEAD'
LOAD = 'LOAD'
OPTIONS = 'OPTIONS'
POST = 'POST'
PUT = 'PUT'

HTTP_METHODS = (DELETE, GET, HEAD, OPTIONS, POST, PUT)

OK = 'OK'
CREATED = 'CREATED'
ACCEPTED = 'ACCEPTED'
SUBSET = 'SUBSET'
PARTIAL = 'PARTIAL'

BAD_REQUEST = 'BAD_REQUEST'
FORBIDDEN = 'FORBIDDEN'
NOT_FOUND = 'NOT_FOUND'
METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
INVALID = 'INVALID'
TIMEOUT = 'TIMEOUT'
CONFLICT = 'CONFLICT'
GONE = 'GONE'

SERVER_ERROR = 'SERVER_ERROR'
UNIMPLEMENTED = 'UNIMPLEMENTED'
BAD_GATEWAY = 'BAD_GATEWAY'
UNAVAILABLE = 'UNAVAILABLE'

STATUS_CODES = (OK, CREATED, ACCEPTED, SUBSET, PARTIAL, BAD_REQUEST, FORBIDDEN, NOT_FOUND,
    METHOD_NOT_ALLOWED, INVALID, CONFLICT, TIMEOUT, GONE, SERVER_ERROR, UNIMPLEMENTED,
    BAD_GATEWAY, UNAVAILABLE)
VALID_STATUS_CODES = (OK, CREATED, ACCEPTED, SUBSET, PARTIAL)
ERROR_STATUS_CODES = (BAD_REQUEST, FORBIDDEN, NOT_FOUND, METHOD_NOT_ALLOWED, INVALID,
    TIMEOUT, CONFLICT, GONE, SERVER_ERROR, UNIMPLEMENTED, BAD_GATEWAY, UNAVAILABLE)

JSON = 'application/json'
URLENCODED = 'application/x-www-form-urlencoded'

__all__ = [name for name in locals().keys() if name.upper() == name and not name.startswith('_')]
