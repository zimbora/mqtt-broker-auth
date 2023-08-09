
module.exports = {

	pathIntoObject : (path,data)=>{
		const segments = path.split("/").filter(segment => segment !== "");

		let obj = {};
		let currentObj = obj;

		segments.forEach((segment, index) => {
			if (index === segments.length - 1) {
				currentObj[segment] = data;
			} else {
				currentObj[segment] = {};
				currentObj = currentObj[segment];
			}
		});
		return obj;
	}
}
