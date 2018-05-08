<?php
if(empty($_FILES['picture']['size'])) {
  die('no pic');
}
$postdata = http_build_query(
        array(
            'username' => 'kiang@osobiz.com',
            'password' => 'admin',
            'grant_type' => 'password',
            'client_id' => 'ushahidiui',
            'client_secret' => '35e7f0bca957836d05ca0492211b0ac707671261',
            'scope' => 'apikeys posts media forms api tags savedsearches sets users stats layers config messages notifications webhooks contacts roles permissions csv tos dataproviders',
        )
);
$opts = array('http' =>
    array(
        'method' => 'POST',
        'header' => 'Content-type: application/x-www-form-urlencoded',
        'content' => $postdata
    )
);
$context = stream_context_create($opts);
$result = file_get_contents('https://lands.olc.tw/platform/oauth/token', false, $context);
$tokenResult = json_decode($result, true);

if (!empty($tokenResult['access_token']) && !empty($tokenResult['token_type'])) {
  //upload the picture
  $cfile = new CURLFile($_FILES['picture']['tmp_name'], $_FILES['picture']['type'], $_FILES['picture']['name']);
  $header = array(
    'Authorization: ' . $tokenResult['token_type'] . ' ' . $tokenResult['access_token'],
    'Content-Type: multipart/form-data',
  );
  $options = array(
    CURLOPT_URL => 'https://lands.olc.tw/platform/api/v3/media',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => array('file' => $cfile),
    CURLOPT_HTTPHEADER => $header,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false
  );
  $ch = curl_init();
  curl_setopt_array($ch, $options);
  $response = json_decode(curl_exec($ch));
  curl_close($ch);

  $theForm = json_decode('{
    "title": "地號",
    "content": "工廠名稱",
    "values": {
      "2b09a551-d500-4738-abf0-1736482a63ba": [{"lat":23.13109914027038,"lon":120.14208991080523}],
      "5b34c754-14c4-4ac0-a8ed-0660980460c1": ["農地盤查分類"], //
      "865e2475-224e-4d88-8592-0108716ba478": ["土地使用分區"],
      "183d1208-b0b8-422b-9a3f-068389fc245a": ["土地使用類別"],
      "8a0c342d-3161-4496-89e8-2c6636e2c226": ["照片編號"],
    },
    "form": {
      "disabled": false,
      "hide_author": false,
      "id": 2,
      "parent_id": null,
      "require_approval": "false",
      "type": "report",
      "url": "https://lands.olc.tw/platform/api/v3/forms/2"
    }
  }');
  if(empty($_POST['info'])) {
    $_POST['info'] = $_POST['land'];
  }
  $thePoint = new stdClass();
  $thePoint->lon = $_POST['longitude'];
  $thePoint->lat = $_POST['latitude'];
  $theForm->title = $_POST['land'];
  $theForm->content = $_POST['info'];
  $theForm->values->{'2b09a551-d500-4738-abf0-1736482a63ba'} = array($thePoint);
  $theForm->values->{'8a0c342d-3161-4496-89e8-2c6636e2c226'} = array($response->id);
  // $theForm->values->{'5b34c754-14c4-4ac0-a8ed-0660980460c1'} = array('test');
  // $theForm->values->{'865e2475-224e-4d88-8592-0108716ba478'} = array('test');
  // $theForm->values->{'183d1208-b0b8-422b-9a3f-068389fc245a'} = array('test');
  $postdata = json_encode($theForm, JSON_UNESCAPED_UNICODE);
  $opts = array('http' =>
  array(
      'method' => 'POST',
      'header' => implode("\r\n", array(
        'Content-Type: application/json;charset=utf-8',
        'Cache-Control: no-cache',
        'Pragma: no-cache',
        'Authorization: ' . $tokenResult['token_type'] . ' ' . $tokenResult['access_token'],
      )),
      'content' => $postdata,
  ));
  $context = stream_context_create($opts);
  $result = json_decode(file_get_contents('http://lands.olc.tw/platform/api/v3/posts', false, $context));
  header('Location: https://lands.olc.tw/posts/' . $result->id);
}
