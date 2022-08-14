import sys
import ddddocr

ocr = ddddocr.DdddOcr()

with open(sys.argv[1], 'rb') as f:
    image = f.read()

res = ocr.classification(image)

print(res)

sys.stdout.flush()