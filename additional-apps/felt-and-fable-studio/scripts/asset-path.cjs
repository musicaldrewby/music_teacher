const fs=require('fs'),path=require('path');
module.exports=function assetPath(root,relative){const local=path.join(root,relative);return fs.existsSync(local)?local:path.resolve(root,'../asset-packs',relative)};
