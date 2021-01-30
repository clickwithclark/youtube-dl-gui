const crypto = require('crypto');
const Utils = require("../Utils");

class Video {
    constructor(url, type, environment) {
        this.url = url;
        this.type = type;
        this.environment = environment;
        this.audioQuality = environment.mainAudioQuality;
        this.audioOnly = environment.mainAudioOnly;
        this.downloadSubs = environment.mainDownloadSubs;
        this.webpage_url = this.url;
        this.hasMetadata = false;
        this.identifier = crypto.randomBytes(16).toString("hex");
    }

    getFilename() {
        if(this.hasMetadata) {
            let sanitizeRegex = /(?:[/<>:"\|\\?\*]|[\s.]$)/g
            let fps = (this.formats[this.selected_format_index].fps != null) ? this.formats[this.selected_format_index].fps : ""
            let height = this.formats[this.selected_format_index].height
            return (this.title.substr(0, 200) + "-(" + height + "p" + fps.toString().substr(0,2) + ")").replaceAll(sanitizeRegex, "_");
        }
    }

    setQuery(query) {
        this.query = query;
        //Set the download path when the video was downloaded
        this.downloadedPath = this.environment.selectedDownloadPath;
    }

    serialize() {
        let formats = [];
        for(const format of this.formats) {
            formats.push(format.serialize());
        }
        return {
            like_count: this.like_count,
            dislike_count: this.dislike_count,
            description: this.description,
            view_count: this.view_count,
            title: this.title,
            tags: this.tags,
            duration: this.duration,
            extractor: this.extractor,
            thumbnail: this.thumbnail,
            uploader: this.uploader,
            average_rating: this.average_rating,
            url: this.url,
            formats: formats
        };
    }

    setMetadata(metadata) {
        this.hasMetadata = true;
        this.like_count = metadata.like_count;
        this.dislike_count = metadata.dislike_count;
        this.average_rating = metadata.average_rating
        this.view_count = metadata.view_count;
        this.title = metadata.title;
        this.description = metadata.description;
        this.tags = metadata.tags;

        this.duration = metadata.duration;
        if(metadata.duration != null) this.duration = new Date(metadata.duration * 1000).toISOString().substr(11, 8);
        if(this.duration != null && this.duration.split(":")[0] === "00") this.duration = this.duration.substr(3);

        this.extractor = metadata.extractor_key;
        this.uploader = metadata.uploader;
        this.thumbnail = metadata.thumbnail;

        this.hasFilesizes = Utils.hasFilesizes(metadata)
        this.formats = Utils.parseAvailableFormats(metadata);
        this.selected_format_index = this.selectHighestQuality();
    }

    selectHighestQuality() {
        this.formats.sort(function (a, b) {
            return parseInt(b.height) - parseInt(a.height) || parseInt(b.fps) - parseInt(a.fps);
        });
        return 0;
    }
}
module.exports = Video;
