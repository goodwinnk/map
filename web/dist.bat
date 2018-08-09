call gulp dist
call aws s3 rm s3://map.nkrasko.com/previous --recursive --region us-east-2
call aws s3 mv s3://map.nkrasko.com/ s3://map.nkrasko.com/previous --exclude 'previous' --recursive --region us-east-2
call aws s3 sync web s3://map.nkrasko.com --region us-east-2