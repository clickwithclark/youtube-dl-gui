let platform;

(function () {
    init();
})();

async function init() {
    //Get platform
    platform = await window.main.invoke('platform');

    //Initialize titlebar
    if(platform === "darwin") {
        new windowbar({'style':'mac', 'dblClickable':false, 'fixed':true, 'title':document.title,'dark':true})
            .appendTo(document.body)
        $('.windowbar-title').css("left", "50%").css("top", "calc(32px /2)");
        $('.windowbar-controls').css("left", "6px").css("top", "6px");
    } else {
        new windowbar({'style':'win', 'dblClickable':false, 'fixed':true, 'title':document.title,'dark':true})
            .appendTo(document.body)
        $('.windowbar').prepend("<img src='img/icon-titlebar-dark.png' alt='youtube-dl-gui icon' class='windowbar-icon'>")
        $('.windowbar-title').css("left", "45px")
    }
    $('.windowbar-minimize').on('click', () => {
        window.main.invoke('titlebarClick', "minimize")
    })
    $('.windowbar-close').on('click', () => {
        window.main.invoke('titlebarClick', "close")
    })
    $('.windowbar-maximize').on('click', () => {
        window.main.invoke('titlebarClick', "maximize")
    })

    $('.video-cards').each(function() {
        let sel = this;
        new MutationObserver(function() {
            //If the queue is completely empty show the empty text
            if ($('.video-cards').is(':empty')) {
                $('.empty').show();
                $('#downloadBtn, #clearBtn').prop("disabled", true);
            } else {
                $('.empty').hide();
            }
            $('#totalProgress .progress-bar').remove();
            $('#totalProgress').prepend('<div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>')
            $('#totalProgress small').html('Ready to download!');
        }).observe(sel, {childList: true, subtree: true});
    });


    //Configures the 4 error toasts
    $('#error, #warning, #connection, #update').toast({
        autohide: false,
        animation: true
    })

    //Add url when user presses enter, but prevent default behavior
    $(document).on("keydown", "form", function(event) {
        if(event.key == "Enter") {
            if ($('#url-form')[0].checkValidity()) {
                parseURL($('#add-url').val());
                $('#url-form').trigger('reset');
            }
            return false;
        }
        return true
    });

    //Add url when user press on the + button
    $('#add-url-btn').on('click', () => {
        if($('#url-form')[0].checkValidity()) {
            parseURL($('#add-url').val());
            $('#url-form').trigger('reset');
        }
    });

    $('#infoModal .dismiss').on('click', () => {
        $('#infoModal').modal("hide");
    });

    $('#settingsModal .dismiss').on('click', () => {
        $('#settingsModal').modal("hide");
    });

    $('#settingsModal .apply').on('click', () => {
        $('#settingsModal').modal("hide");
        let settings = {
            updateBinary: $('#updateBinary').prop('checked'),
            updateApplication: $('#updateApplication').prop('checked'),
            enforceMP4: $('#enforceMP4').prop('checked'),
            sizeMode: $('#sizeSetting').val(),
            maxConcurrent: parseInt($('#maxConcurrent').val())
        }
        window.main.invoke("settingsAction", {action: "save", settings})
    });

    $('#maxConcurrent').on('input', () => {
        $('#concurrentLabel').html($('#maxConcurrent').val());
    })

    $('#settingsBtn').on('click', () => {
        window.main.invoke("settingsAction", {action: "get"}).then((settings) => {
            console.log(settings)
            $('#updateBinary').prop('checked', settings.updateBinary);
            $('#updateApplication').prop('checked', settings.updateApplication);
            $('#enforceMP4').prop('checked', settings.enforceMP4);
            $('#maxConcurrent').val(settings.maxConcurrent);
            $('#concurrentLabel').html(settings.maxConcurrent);
            $('#sizeSetting').val(settings.sizeMode);
            $('#settingsModal').modal("show");
        })
    });

    $('#infoModal .json').on('click', () => {
        window.main.invoke('videoAction', {action: "downloadInfo", identifier: $('#infoModal .identifier').html()})
    });

    $('#clearBtn').on('click', () => {
        $('.video-cards').children().each(function () {
            let identifier = this.id;
            $(getCard(identifier)).remove();
            window.main.invoke("videoAction", {action: "stop", identifier: identifier});
        })
        $('#totalProgress .progress-bar').remove();
        $('#totalProgress').prepend('<div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>')
    })

    $('#locationBtn').on('click', () => {
        window.main.invoke("downloadFolder");
    });

    $('#subtitleBtn').on('click', () => {
        $('.video-cards').children().each(function () {
            let identifier = this.id;
            let state = $(this).find('.subtitle-btn i').hasClass("bi-card-text-strike");
            window.main.invoke("videoAction", {action: "subtitles", identifier: identifier, subtitle: state});
            if(state) $(this).find('.subtitle-btn i').removeClass("bi-card-text-strike").addClass("bi-card-text").attr("title", "Subtitles enabled");
            else $(this).find('.subtitle-btn i').removeClass("bi-card-text").addClass("bi-card-text-strike").attr("title", "Subtitles disabled");
        })
        let state = $('#subtitleBtn i').hasClass("bi-card-text-strike");
        window.main.invoke('videoAction', {action: "setmain", setting: "subtitles", value: state})
        if(state) $('#subtitleBtn i').removeClass("bi-card-text-strike").addClass("bi-card-text").attr("title", "Subtitles enabled");
        else $('#subtitleBtn i').removeClass("bi-card-text").addClass("bi-card-text-strike").attr("title", "Subtitles disabled");
    })

    $('#downloadBtn').on('click', async () => {
        let videos = []
        let videoCards = $('.video-cards').children();
        for(const card of videoCards) {
            let isDownloadable = await window.main.invoke("videoAction", {action: "downloadable", identifier: card.id})
            if(isDownloadable) {
                console.log(card.id);
                videos.push({
                    identifier: card.id,
                    format: $(card).find('.custom-select.download-quality').val(),
                    type: $(card).find('.custom-select.download-type').val(),
                })
                $(card).find('.progress').addClass("d-flex");
                $(card).find('.metadata.left').html('<strong>Speed: </strong>' + "0.00MiB/s");
                $(card).find('.metadata.right').html('<strong>ETA: </strong>' + "Unknown");
                $(card).find('.options').addClass("d-flex");
                $(card).find('select').addClass("d-none");
                $(card).find('.download-btn, .subtitle-btn i').addClass("disabled");
            }
        }
        let args = {
            action: "download",
            all: true,
            videos: videos
        }
        window.main.invoke('videoAction', args)
        $('#downloadBtn, #clearBtn').prop("disabled", true);
        $('#totalProgress .progress-bar').remove();
        $('#totalProgress').prepend('<div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>')
        $('#totalProgress small').html(`Downloading video queue - 0 of ${videos.length} completed`);
    });

    $('#download-type').on('change', function () {
        let type = this.selectedOptions[0].value;
        $('.video-cards').children().each(function () {
            let quality = $('#download-quality').find(':selected').val();
            $(this).find('.custom-select.download-type').val(type).change();
            if(quality === "best") {
                $(this).find('.custom-select.download-quality').val($(this).find(`.custom-select.download-quality option.${type}:first`).val()).change();
            } else if(quality === "worst") {
                $(this).find('.custom-select.download-quality').val($(this).find(`.custom-select.download-quality option.${type}:last`).val()).change();
            }
        });
    });

    $('#download-quality').on('change', function () {
        let value = this.selectedOptions[0].value;
        $('.video-cards').children().each(function () {
            let type = $('#download-type').find(':selected').val();
            if(value === "best") {
                $(this).find('.custom-select.download-quality').val($(this).find(`.custom-select.download-quality option.${type}:first`).val()).change();
            } else if(value === "worst") {
                $(this).find('.custom-select.download-quality').val($(this).find(`.custom-select.download-quality option.${type}:last`).val()).change();
            }
        });
    });


    //Enables the main process to show logs/errors in the renderer dev console
    window.main.receive("log", (arg) => console.log(arg));

    //Enables the main process to show toasts.
    window.main.receive("toast", (arg) => showToast(arg));

    //Updates the windowbar icon when the app gets maximized/unmaximized
    window.main.receive("maximized", (maximized) => {
        if(maximized) $('.windowbar').addClass("fullscreen");
        else $('.windowbar').removeClass("fullscreen");
    });

    window.main.receive("updateGlobalButtons", (arg) => updateButtons(arg));

    //Receive calls from main process and dispatch them to the right function
    window.main.receive("videoAction", (arg) => {
        switch(arg.action) {
            case "add":
                addVideo(arg);
                break;
            case "remove":
                $(getCard(arg.identifier)).remove();
                break;
            case "progress":
                updateProgress(arg);
                break;
            case "info":
                showInfoModal(arg.metadata, arg.identifier);
                break;
            case "size":
                updateSize(arg);
        }
    });

    //Opens the input menu (copy/paste) when an editable object gets right clicked.
    document.body.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let node = e.target;
        while (node) {
            if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
                window.main.invoke('openInputMenu');
                break;
            }
            node = node.parentNode;
        }
    });

}

function parseURL(data) {
    if(data.includes(',')) {
        let urls = data.replaceAll(" ", "").split(",");
        for(const url of urls) {
            window.main.invoke('videoAction', {action: "entry", url: url});
        }
    } else {
        window.main.invoke('videoAction', {action: "entry", url: data});
    }
}

function showToast(toastInfo) {
    if(toastInfo.type === "error" || toastInfo.type === "warning" || toastInfo.type === "update") {
        if(toastInfo.title != null) {
            $(`.${toastInfo.type}-title`).html(toastInfo.title);
        }
        $(`.${toastInfo.type}-body`).html(toastInfo.msg);
        $(`#${toastInfo.type}`).toast('show').css('visibility', 'visible');
    } else if(toastInfo.type === "connection") {
        $(`#${toastInfo.type}`).toast('show').css('visibility', 'visible');
    } else {
        console.error("Main tried to show a toast that doesn't exist.")
    }
}

//TODO add loader when thumbnail is loading OR wait for the thumbnail to be loaded before making the new video visible.
function addVideo(args) {
    let template = $('.template.video-card').clone();
    $(template).removeClass('template');
    $(template).prop('id', args.identifier);
    if(args.type === "single") {
        $(template).find('.card-title')
            .html(args.title)
            .prop('title', args.title);
        $(template).find('.progress-bar')
            .addClass('progress-bar-striped')
            .addClass('progress-bar-animated')
            .width("100%");
        if(args.subtitles) $(template).find('.subtitle-btn i').removeClass("bi-card-text-strike").addClass("bi-card-text").attr("title", "Subtitles enabled");
        $(template).find('img').prop("src", args.thumbnail);
        $(template).find('.info').addClass("d-none");
        $(template).find('.progress small').html("Initializing download")
        $(template).find('.metadata.left').html('<strong>Duration: </strong>' + ((args.duration == null) ? "Unknown" : args.duration));
        if(!args.hasFilesizes) {
            $(template).find('.metadata.right').html('<strong>Size: </strong>Unknown');
        } else if(args.loadSize) {
            $(template).find('.metadata.right').html('<strong>Size: </strong><i class="lds-dual-ring"></i>');
        } else {
            $(template).find('.metadata.right').html('<strong>Size: </strong><button class="btn btn-dark">Load</button>').on('click', () => {
                window.main.invoke("videoAction", { action: "size", clicked: true, identifier: args.identifier, formatLabel: $(template).find('.custom-select.download-quality').find(":selected").val()})
                $(template).find('.metadata.right').html('<strong>Size: </strong><i class="lds-dual-ring"></i>');
            });
        }

        $(template).find('.custom-select.download-type').on('change', function () {
            let isAudio = this.selectedOptions[0].value === "audio";
            for(const elem of $(template).find('option')) {
                if($(elem).hasClass("video")) {
                    $(elem).toggle(!isAudio)
                } else if($(elem).hasClass("audio")) {
                    $(elem).toggle(isAudio)
                }
            }
            window.main.invoke("videoAction", {action: "audioOnly", identifier: args.identifier, value: isAudio});
            $(template).find('.custom-select.download-quality').val(isAudio ? "best" : args.formats[args.selected_format_index].display_name).change();
        });

        for(const format of args.formats) {
            let option = new Option(format.display_name, format.display_name);
            $(template).find('.custom-select.download-quality').append(option);
            $(option).addClass("video");
        }

        $(template).find('.remove-btn').on('click', () => {
            $(getCard(args.identifier)).remove();
            window.main.invoke("videoAction", {action: "stop", identifier: args.identifier});
        });

        $(template).find('.custom-select.download-quality').on('change', function () {
            if(!args.hasFilesizes) return;
            let isAudio = $(template).find(".custom-select.download-type")[0].value === "audio";
            if(isAudio) {
                window.main.invoke("videoAction", {action: "audioQuality", identifier: args.identifier, value: $(template).find('.custom-select.download-quality').find(":selected").val()});
                window.main.invoke("videoAction", {action: "size", clicked: false, formatLabel: $(template).find('.custom-select.download-quality').find(":selected").val(), identifier: args.identifier});
            } else {
                window.main.invoke("videoAction", {
                    action: "size",
                    clicked: false,
                    formatLabel: $(template).find('.custom-select.download-quality').find(":selected").val(),
                    identifier: args.identifier
                });
            }
            $(template).find('.metadata.right').html('<strong>Size: </strong><i class="lds-dual-ring"></i>');
        });

        $(template).find('.download-btn').on('click', () => {
            let downloadArgs = {
                action: "download",
                url: args.url,
                identifier: args.identifier,
                format: $(template).find('.custom-select.download-quality').val(),
                type: $(template).find('.custom-select.download-type').val(),
                all: false
            }
            window.main.invoke("videoAction", downloadArgs)
            $('#downloadBtn, #clearBtn').prop("disabled", true);
            $(template).find('.progress').addClass("d-flex");
            $(template).find('.metadata.left').html('<strong>Speed: </strong>' + "0.00MiB/s");
            $(template).find('.metadata.right').html('<strong>ETA: </strong>' + "Unknown");
            $(template).find('.options').addClass("d-flex");
            $(template).find('select').addClass("d-none");
            $(this).find('.download-btn, .subtitle-btn i').addClass("disabled");
        });

        $(template).find('.subtitle-btn').on('click', () => {
            let state = $(template).find('.subtitle-btn i').hasClass("bi-card-text-strike")
            window.main.invoke("videoAction", {action: "subtitles", identifier: args.identifier, subtitle: state});
            if(state) $(template).find('.subtitle-btn i').removeClass("bi-card-text-strike").addClass("bi-card-text").attr("title", "Subtitles enabled")
            else $(template).find('.subtitle-btn i').removeClass("bi-card-text").addClass("bi-card-text-strike").attr("title", "Subtitles disabled")
        });

        $(template).find('.info-btn').on('click', () => {
            window.main.invoke("videoAction", {action: "info", identifier: args.identifier});
        });

        $(template).find('.open .folder').on('click', () => {
            window.main.invoke("videoAction", {action: "open", identifier: args.identifier, type: "folder"});
        });
        $(template).find('.open .item').on('click', () => {
            window.main.invoke("videoAction", {action: "open", identifier: args.identifier, type: "item"});
        });


    } else if(args.type === "metadata") {
        $(template).find('.card-title')
            .html(args.url)
            .prop('title', args.url);
        $(template).find('.progress-bar')
            .addClass('progress-bar-striped')
            .addClass('progress-bar-animated')
            .width("100%")
            .prop("aria-valuenow", "indefinite");
        $(template).find('.progress').addClass("d-flex");
        $(template).find('.options').addClass("d-none");
        $(template).find('.metadata.info').html('Downloading metadata...');
        $(template).find('.buttons').children().each(function() { $(this).find('i').addClass("disabled"); });

    } else if(args.type === "playlist") {
        $(template).find('.card-title')
            .html(args.url)
            .prop('title', args.url);
        $(template).find('.progress small')
            .html('0.00% - 0 of ?')
        $(template).find('.progress').addClass("d-flex");
        $(template).find('.options').addClass("d-none");
        $(template).find('.metadata.info').html('Fetching video metadata...');
        $(template).find('.buttons').children().each(function() { $(this).find('i').addClass("disabled"); });
    }
    $('.video-cards').append(template);

    //Update the type and quality values to match the global set values.
    // This only works after the card has been appended.
    $('#download-type').change();
    $('#download-quality').change();
}

function updateProgress(args) {
    if(args.identifier === "queue") {
        $('#totalProgress small').html(`Downloading video queue - ${args.progress.done} of ${args.progress.total} completed`);
        $('#totalProgress .progress-bar').css("width", args.progress.percentage).attr("aria-valuenow", args.progress.percentage.slice(0,-1));
        return
    }
    let card = getCard(args.identifier);
    if(args.progress.reset != null && args.progress.reset) {
        resetProgress($(card).find('.progress-bar')[0], card);
        return;
    }
    if(args.progress.finished != null && args.progress.finished) {
        $(card).find('.progress small').html((args.progress.isAudio ? "Audio" : "Video") + " downloaded - 100%");
        $(card).find('.progress-bar').attr('aria-valuenow', 100).css('width', "100%");
        $(card).find('.options').addClass("d-none");
        $(card).find('.options').removeClass("d-flex");
        $(card).find('.open').addClass("d-flex");
        return;
    }
    if(args.progress.done != null && args.progress.total != null) {
        $(card).find('.progress small').html(`${args.progress.percentage} - ${args.progress.done} of ${args.progress.total} `);
    } else {
        if(parseFloat(args.progress.percentage.slice(0, -1)) > parseFloat($(card).find('.progress-bar').attr("aria-valuenow"))) {
            $(card).find('.progress-bar').attr('aria-valuenow', args.progress.percentage.slice(0,-1)).css('width', args.progress.percentage);
            $(card).find('.progress small').html((args.progress.isAudio ? "Downloading audio" : "Downloading video") + " - " + args.progress.percentage);
            $(card).find('.metadata.right').html('<strong>ETA: </strong>' + args.progress.eta);
            $(card).find('.metadata.left').html('<strong>Speed: </strong>' + args.progress.speed);
        }
    }

}

function updateSize(args) {
    let card = getCard(args.identifier);
    if(args.size == null) {
        $(card).find('.metadata.right').html('<strong>Size: </strong><button class="btn btn-dark">Load</button>');
    } else if(args.size === "") {
        $(card).find('.metadata.right').html('<strong>Size: </strong>' + "Unknown");
    } else {
        $(card).find('.metadata.right').html('<strong>Size: </strong>' + args.size);
    }
}

function showInfoModal(info, identifier) {
    let modal = $('#infoModal');
    $(modal).find('img').prop("src", info.thumbnail);
    $(modal).find('.modal-title').html(info.title);
    $(modal).find('#info-description').html(info.description == null ? "No description was found." : info.description);
    $(modal).find('.uploader').html('<strong>Uploader: </strong>' + (info.uploader == null ? "Unknown" : info.uploader));
    $(modal).find('.extractor').html('<strong>Extractor: </strong>' + (info.extractor == null ? "Unknown" : info.extractor));
    $(modal).find('.url').html('<strong>URL: </strong>' + info.url);
    $(modal).find('[title="Views"]').html('<i class="bi bi-eye"></i> ' + (info.view_count == null ? "-" : info.view_count));
    $(modal).find('[title="Like / dislikes"]').html('<i class="bi bi-hand-thumbs-up"></i> ' + (info.like_count == null ? "-" : info.like_count) + ' &nbsp;&nbsp; <i class="bi bi-hand-thumbs-down"></i> ' + (info.dislike_count == null ? "-" : info.dislike_count));
    $(modal).find('[title="Average rating"]').html('<i class="bi bi-star"></i> ' + (info.average_rating == null ? "-" : info.average_rating.toString().slice(0,3)));
    $(modal).find('[title="Duration"]').html('<i class="bi bi-clock"></i> ' + (info.duration == null ? "-" : info.duration));
    $(modal).find('.identifier').html(identifier);
    $(modal).modal("show");
}

function resetProgress(elem, card) {
    $(elem).removeClass("progress-bar-striped").removeClass("progress-bar-animated");
    $(elem).remove();
    $(card).find('.progress').prepend('<div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>')
}

function updateButtons(videos) {
    let downloadableVideos = false;

    if(videos.length > 0) $('#clearBtn').prop("disabled", false);
    else $('#clearBtn').prop("disabled", true);

    for(const video of videos) {
        let domVideo = getCard(video.identifier);
        if(domVideo == null) continue;
        if(video.downloadable) {
            $('#downloadBtn').prop("disabled", false);
            downloadableVideos = true;
            break;
        }
        if(!downloadableVideos) {
            $('#downloadBtn').prop("disabled", true);
        }
    }
}

function getCard(identifier) {
    let card;
    $('.video-cards').children().each(function() {
        if($(this).prop('id') === identifier) {
            card = this;
            return false;
        }
    })
    return card;
}
