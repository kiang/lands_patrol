var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
window.app = {};
var app = window.app;

app.Button = function(opt_options) {
  var options = opt_options || {};
  var button = document.createElement('button');
  button.innerHTML = options.bText;
  var this_ = this;
  var handleButtonClick = function() {
    window.open(options.bHref);
  };

  button.addEventListener('click', handleButtonClick, false);
  button.addEventListener('touchstart', handleButtonClick, false);

  var element = document.createElement('div');
  element.className = options.bClassName + ' ol-unselectable ol-control';
  element.appendChild(button);

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });
}
ol.inherits(app.Button, ol.control.Control);

var styleRed = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 3,
    fill: new ol.style.Fill({
      color: [255, 0, 0, 1]
    })
  })
});

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var popup = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

closer.onclick = function() {
  popup.setPosition(undefined);
  closer.blur();
  return false;
};

var nlscMatrixIds = new Array(21);
for (var i=0; i<21; ++i) {
  nlscMatrixIds[i] = i;
}

var vector = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'factories.json',
    format: new ol.format.GeoJSON()
  }),
  style: styleRed
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.5
});

var landLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://nlsc.olc.tw/lands/S_Maps/wmts/DMAPS/default/EPSG:3857/{TileMatrix}/{TileRow}/{TileCol}',
        requestEncoding: 'REST',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        wrapX: true,
        attributions: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.5
});

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.301507, 23.124694]),
  zoom: 11
});

var map = new ol.Map({
  layers: [baseLayer, landLayer, vector],
  overlays: [popup],
  target: 'map',
  view: appView
});

map.addControl(sidebar);

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
        console.log(error.message);
      });

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

var changeTriggered = false;
geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  if(coordinates) {
    positionFeature.setGeometry(new ol.geom.Point(coordinates));
    if(false === changeTriggered) {
      var mapView = map.getView();
      mapView.setCenter(coordinates);
      mapView.setZoom(17);
      changeTriggered = true;
    }
  }
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});

/**
 * Add a click handler to the map to render the popup.
 */
var currentCoordinate, currentCoordinateLonLat;
var gmlParser = new ol.format.WFS();
map.on('singleclick', function(evt) {
  sidebar.close();
  $('#loadingModal').modal('show');
  currentCoordinate = evt.coordinate;
  currentCoordinateLonLat = ol.proj.toLonLat(evt.coordinate);
  $.ajax({
    url: 'https://nlsc.olc.tw/nlsc/dmaps/CadasMapPointQuery/' + currentCoordinateLonLat[0] + '/' + currentCoordinateLonLat[1],
    type: 'GET',
    success: function(r) {
      var message = '', landTitle = '';
      var objs = gmlParser.readFeatures(r);
      if(objs.length > 0) {
        var p = objs[0].getProperties();
        for(k in p) {
          if(k !== 'Shape') {
            message += '<br />' + k + ': ' + p[k];
            if(p[k] && (k === 'LANDUSE' || k === 'LANDDETATIS')) {
              message += ' ' + landCodes[p[k]];
            }
          }
        }
        var landTitle = p.CITY + p.TOWN + ' ' + p.OFFICE + p.SECT + '-' + p.LANDNO;
        $('#sidebar-main-block').html(message);
        sidebar.open('home');
        $('#factoryLand').val(landTitle);
        $('#factoryLongitude').val(currentCoordinateLonLat[0]);
        $('#factoryLatitude').val(currentCoordinateLonLat[1]);
      }
      if(landTitle !== '') {
        content.innerHTML = landTitle;
        popup.setPosition(currentCoordinate);
      } else {
        popup.setPosition(undefined);
        closer.blur();
      }
      $('#loadingModal').modal('hide');
    }
  });
});

var landCodes = {
  'AA': '特定農業區',
  'AB': '一般農業區',
  'AC': '鄉村區',
  'AD': '工業區',
  'AE': '森林區',
  'AF': '山坡地保育區',
  'AG': '風景區',
  'AH': '特定專用區',
  'AJ': '國家公園區',
  'EA': '甲種建築用地',
  'EB': '乙種建築用地',
  'EC': '丙種建築用地',
  'ED': '丁種建築用地',
  'EE': '農牧用地',
  'EF': '礦業用地',
  'EG': '交通用地',
  'EH': '水利用地',
  'EJ': '遊憩用地',
  'EK': '古蹟保存用地',
  'EL': '生態保護用地',
  'EM': '國土保安用地',
  'EN': '墳墓用地',
  'EP': '特定目的事業用地',
  'EQ': '鹽業用地',
  'ER': '窯業用地',
  'ES': '林業用地',
  'ET': '養殖用地',
  'EZ': '暫未編定',
};
