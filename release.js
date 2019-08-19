/*
 *  Base PDF Rendering
 */

// The workerSrc property shall be specified.
PDFJS.workerSrc = "/flipper/pdf.worker.js";

var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = [],
    scale = 2,
    canvas = document.getElementById("the-canvas"),
    ctx = canvas.getContext("2d"),
    canvasCached = document.getElementById("the-canvas-cache"),
    ctxc = canvasCached.getContext("2d"),
    imgDisplay = document.getElementById("pdfDisplay"),
    _PDFCACHE = [],
    dispStyle = 'double';

// Some browsers don't like ES6 syntax
const resizeWrapper = function() {
    const wrapper = document.getElementById("pdfWrapper");
    const widthWindow = $(window).width();
    const heightWindow = $('body').height();
    const widthRatio = widthWindow / heightWindow > 1 ? 11/17 : 11/8.5;
    dispStyle = widthWindow / heightWindow > 1 ? 'double' : 'single';
    if (widthWindow * widthRatio < heightWindow) {
        wrapper.style.width = (widthWindow) + "px";
        wrapper.style.height = (widthWindow * widthRatio) + "px";
        wrapper.style.left = 0 + "px";
    }
    else {
        const widthWrapper = (heightWindow * (1/widthRatio));
        wrapper.style.width = widthWrapper + "px";
        wrapper.style.height = (heightWindow) + "px";
        wrapper.style.left = ((widthWindow - widthWrapper) / 2) + "px";
    }
    if ($("#pdfWrapper").turn("is")) {
        $("#pdfWrapper").turn("display", dispStyle);
    }
}

/**
 * INITIAL render call
 */
function renderPageInit(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(function(page) {
    var wrapper = document.getElementById("pdfWrapper");
    var convport = imgDisplay;
    var viewport = page.getViewport(scale);
    /*
     * TODO     :: Make wrapper responsive to resizing
     */
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    convport.style.width = "100%";
    convport.style.height = "100%";
    wrapper.style.width = (Math.floor(viewport.width/(scale+0.75)) * 2) + "px";
    wrapper.style.height = Math.floor(viewport.height/(scale+0.75)) + "px";
    resizeWrapper();

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function() {
      // Make the loading thingy invisible
      $('.uploading').remove()

      pageRendering = false;
      // When rendering finished convert to an img
      var inter = canvas.toDataURL();
      convport.src = inter;
      // TurnJS Init Call
      $("#pdfWrapper").turn({
          display: dispStyle,
          acceleration: true,
          // autoCenter: true,
          pages: pdfDoc.numPages,
          // when: {
          //     turned: function(e, page, view) {
          //         document.getElementById("page_num").textContent = page;
          //     }
          // }
      });
      _PDFCACHE.push(inter);
      // Cache next page
      renderCached(2);///
    });
  });

  // Update page counters
  // document.getElementById("page_num").textContent = pageNum;
}

/*
 *  Render to secondary canvas when lookahead bound is moved
 */

function renderCached(num) {
  pdfDoc.getPage(num).then(function(page) {
    var viewport = page.getViewport(scale);
    canvasCached.width = viewport.width;
    canvasCached.height = viewport.height;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctxc,
      viewport: viewport
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function() {
      _PDFCACHE.push(canvasCached.toDataURL());
      var imgDisplayNext = document.createElement("img")
      imgDisplayNext.src = _PDFCACHE[num-1];
      // Murder right mouse button-based hopes and/or dreams
      $(imgDisplayNext).on('contextmenu', function(e) {
         return false
      })
      $(imgDisplayNext).on('mousedown', function (e) {
        if (e.which == 3)
          e.preventDefault()
      })
      $(imgDisplayNext).on('taphold', function (e) {
        e.preventDefault()
      })
      $("#pdfWrapper").turn("addPage", imgDisplayNext, num);
      // if even number render next page (for flipjs double display)
      if (num < pdfDoc.numPages) {
          renderCached(num + 1);
      }
    });
  });
}

/**
 * Displays previous page.
 */
$(".pdfPrev").on("click", function() {
  $("#pdfWrapper").turn("previous");
});

/**
 * Displays next page.
 */
$(".pdfNext").on("click", function() {
  $("#pdfWrapper").turn("next");
});

var loadingBar = document.getElementById("loading-bar");
var loadingPdf = function(progress) {
    var percent = progress.loaded / progress.total;
    if (percent < 1) {
        loadingBar.value = percent;
    }
    else {
        $(loadingBar).fadeOut(400);
    }
}

/**
 * Asynchronously downloads PDF.
 */
PDFJS.getDocument(url, false, null, loadingPdf).then(function(pdfDoc_) {
  pdfDoc = pdfDoc_;
  // document.getElementById("page_count").textContent = pdfDoc.numPages;

  // Initial/first page rendering
  renderPageInit(pageNum);
});

$(window).resize(() => {
    resizeWrapper();
    const wrapper = document.getElementById("pdfWrapper");
    $("#pdfWrapper").turn("size", wrapper.style.width, wrapper.style.height);
});
