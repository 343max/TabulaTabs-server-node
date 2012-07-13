function findMetaInPageTitle(pageInfo) {

	var getTitleSegments = function(pageInfo) {
		var dividers = [' | ', ' « ', ' » ', ' / ', ' – ', ' - '];

		for(var i = 0; i < dividers.length; i++) {
			var divider = dividers[i];
			var segments = pageInfo.title.split(divider);

			if(segments.length == 2) {
				if (segments[0].length < segments[1].length) {
					pageInfo.siteTitle = segments[0];
					pageInfo.pageTitle = segments[1];
				} else {
					pageInfo.siteTitle = segments[1];
					pageInfo.pageTitle = segments[0];
				}

				return;
			}

			if (segments.length > 2) {
				var bestTitle = '';

				for (var i = 0; i < segments.length; i++) {
					if(segments[i].length > bestTitle.length) bestTitle = segments[i];
				}

				pageInfo.pageTitle = bestTitle;

				return;
			}
		}
	}

	pageInfo.pageTitle = pageInfo.title;
	pageInfo.siteTitle = '';

	var fullDomain = pageInfo.URL.replace(/^https?:\/\//, '').replace(/\/.*/, '');
	var shortDomain = fullDomain.replace(/^(www|m)\./, '');
	var trunkDomain = shortDomain.replace(/\.[^\.]+$/, '');

	pageInfo.shortDomain = shortDomain;

	getTitleSegments(pageInfo);

	return pageInfo;
}