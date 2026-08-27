
module.exports = {

	pathIntoObject : (path,data)=>{
		const segments = path.split("/").filter(segment => segment !== "");

		const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
		let obj = Object.create(null);
		let currentObj = obj;

		segments.forEach((segment, index) => {
			if (FORBIDDEN_KEYS.has(segment)) {
				throw new Error(`Invalid path segment: ${segment}`);
			}
			if (index === segments.length - 1) {
				currentObj[segment] = data;
			} else {
				currentObj[segment] = Object.create(null);
				currentObj = currentObj[segment];
			}
		});
		return obj;
	}
}
