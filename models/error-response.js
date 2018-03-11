'use strict';

/**
 * Error report from the server.
 */
class ErrorResponse {
  /**
   * To construct error response provide a status `code`
   * and the reason `message`.
   *
   * @param {String} code Code name of the error message
   * @param {String} message A reason message.
   */
  constructor(code, message) {
    this.code = code || 'unknown_error';
    this.message = message || 'Unknown error ocurred';
  }
}

module.exports.ErrorResponse = ErrorResponse;
