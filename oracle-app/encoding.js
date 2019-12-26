/*
 * This module is used for encoding values to hexademical string
 * before sending it back to oracle contract
 */

const ResponseTypes = require('./responseType');


function encodeBool(value) {
	return value == true ? "01" : "00";
}

function encodeInt(value) {
	var buf = Buffer.allocUnsafe(4);
	buf.writeInt32LE(value);
	return buf.toString('hex');
}

function encodeDouble(value) {
	const buf = Buffer.allocUnsafe(8);
	buf.writeDoubleLE(value);
	return buf.toString('hex');
}

function encodeString(value) {
	value = value.toString
	var buf = Buffer.allocUnsafe(1);
	buf.writeUInt8(value.length);
	return Buffer.concat([ buf, Buffer.from(value, 'ascii') ]).toString('hex');
}


/*
 * Encode given value to hex based on type
 * value is encoded so that receiving contract
 * can decode it using unpack<expected type>(bytes)
 */
function encode(value, type) {
	if (value === null) {
		return "";
	}

	if (type == ResponseTypes.Bool) {
		return encodeBool(value);
	}
	else if (type == ResponseTypes.Int) {
		return encodeInt(value);
	}
	else if (type == ResponseTypes.Double) {
		return encodeDouble(value);
	}
	else if (type == ResponseTypes.String) {
		return encodeString(value);
	}
	return "";
}


module.exports = encode;