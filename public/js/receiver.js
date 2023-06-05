(function() {
    let senderID;
    const socket = io();

    function generateID() {
        return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
    }

    document.querySelector("#receiver-start-con-btn").addEventListener("click", function() {
        senderID = document.querySelector("#join-id").value;
        if (senderID.length == 0) {
            return;
        }
        let joinID = generateID();
        socket.emit("receiver-join", {
            uid: joinID,
            sender_uid: senderID
        });
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    let fileShare = {};

    socket.on("fs-meta", function(metadata) {
        fileShare.metadata = metadata;
        fileShare.transmitted = 0;
        fileShare.buffer = [];

        let el = document.createElement("div");
        el.classList.add("item");
        el.innerHTML = `
        <div class="Icons-container">
            <div class="IconsType">${getFileIcon(metadata.filename)}</div>
            <div class="progress">0%</div>
        </div>
        <div class="filename">${metadata.filename}</div>
        <div class="download-button">
            <button class="download-btn">Download</button>
        </div>
        `;

        document.querySelector(".files-list").appendChild(el);

        fileShare.progress_node = el.querySelector(".progress");

        socket.on("fs-download-response", function(response) {
            if (response.success) {
                const blob = new Blob(fileShare.buffer);
                download(blob, fileShare.metadata.filename);
            } else {
                console.log("Помилка під час завантаження файлу.");
            }
        });

        socket.emit("fs-start", {
            uid: senderID
        });
    });

    socket.on("fs-share", function(buffer) {
        fileShare.buffer.push(buffer);
        fileShare.transmitted += buffer.byteLength;
        fileShare.progress_node.innerText = Math.trunc((fileShare.transmitted / fileShare.metadata.total_buffer_size) * 100) + "%";

        if (fileShare.transmitted == fileShare.metadata.total_buffer_size) {
            download(new Blob(fileShare.buffer), fileShare.metadata.filename);
            fileShare = {};
        } else {
            socket.emit("fs-start", {
                uid: senderID
            });
        }
    });

    function getFileIcon(filename) {
        let extension = filename.split(".").pop();
        let iconClass = "";

        switch (extension) {
            case "txt":
                iconClass = "fa-file-text-o";
                break;
            case "pdf":
                iconClass = "fa-file-pdf-o";
                break;
            case "doc":
            case "docx":
                iconClass = "fa-file-word-o";
                break;
            case "xls":
            case "xlsx":
                iconClass = "fa-file-excel-o";
                break;
            case "ppt":
            case "pptx":
                iconClass = "fa-file-powerpoint-o";
                break;
            case "jpg":
            case "jpeg":
            case "png":
                iconClass = "fa-file-image-o";
                break;
            case "MP4":
            case "AVI":
            case "MOV":
                iconClass = "fa-file-video-o";
                break;
            case "zip":
            case "rar":
            case "7z":
                iconClass = "fa-file-archive-o";
                break;
            default:
                iconClass = "fa-file-o";
        }

        return `<i class="fa ${iconClass} file-icon"></i>`;
    }

    function download(blob, filename) {
        var downloadLink = document.createElement("a");
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.download = filename;
        downloadLink.click();
    }
})();
