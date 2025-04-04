module.exports = `<!doctype html>
<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <style>
  body{background-color:#FFFFFF;font-family:sans-serif;-webkit-font-smoothing:antialiased;font-size:16px;line-height:1.4;margin:0;padding:0;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}table{border-collapse:separate;mso-table-lspace:0;mso-table-rspace:0;width:100%;}table td{font-family:sans-serif;font-size:16px;vertical-align:top;}.body{background-color:#FFFFFF;width:100%;}.container{display:block;margin:0 auto!important;width:100%;}.main{background:#ffffff;width:100%;}.wrapper{box-sizing:border-box;padding:20px;}.content-block{padding-bottom:10px;padding-top:10px;}.footer{clear:both;margin-top:10px;text-align:center;width:100%;}.footer td,.footer p,.footer span,.footer a{color:#999999;font-size:12px;text-align:center;}h1,h2,h3,h4{color:#000000;font-family:sans-serif;font-weight:400;line-height:1.4;margin:0;margin-bottom:30px;}h1{font-size:35px;font-weight:300;text-align:center;text-transform:capitalize;}p,ul,ol{font-family:sans-serif;font-weight:normal;margin:0;margin-bottom:15px;}p li,ul li,ol li{list-style-position:inside;margin-left:5px;}a{color:#cf4139;text-decoration:underline;}.last{margin-bottom:0;}.first{margin-top:0;}.align-center{text-align:center;}.align-right{text-align:right;}.align-left{text-align:left;}.clear{clear:both;}.mt0{margin-top:0;}.mb0{margin-bottom:0;}.preheader{color:transparent;display:none;height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;visibility:hidden;width:0;}hr{border:0;border-bottom:1px solid #f6f6f6;margin:20px 0;}@media only screen and (max-width:620px){table.body h1{font-size:28px!important;margin-bottom:10px!important}table.body .wrapper,table.body .article{padding:10px!important}table.body .content{padding:0!important}table.body .container{padding:0!important;width:100%!important}table.body .main{border-left-width:0!important;border-radius:0!important;border-right-width:0!important}table.body .img-responsive{height:auto!important;max-width:100%!important;width:auto!important}}@media all{.ExternalClass{width:100%}.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div{line-height:100%}.apple-link a{color:inherit!important;font-family:inherit!important;font-size:inherit!important;font-weight:inherit!important;line-height:inherit!important;text-decoration:none!important}#MessageViewBody a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit}}
  </style>
</head>

<body>
  <span class="preheader">{{ snippet }}</span>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
    <tr>
      <td>&nbsp;</td>
      <td class="container">
        <div class="content">
          <table role="presentation" class="main">
            <tr>
              <td class="wrapper">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      {{ content }}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <div class="footer">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td class="content-block">
                  <span class="apple-link">Advanced Access Manager, WordPress Plugin</span><br/>
                  <a href="https://aamportal.com">aamportal.com</a>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </td>
      <td>&nbsp;</td>
    </tr>
  </table>
</body>

</html>`;