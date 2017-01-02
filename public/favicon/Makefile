all: favicon.ico favicon.png favicon-152.png favicon-144.png favicon-120.png favicon-114.png favicon-72.png favicon-57.png

clean:
	rm -f favicon.ico favicon.png favicon-152.png favicon-144.png favicon-120.png favicon-114.png favicon-72.png favicon-57.png

favicon.pdf: favicon.svg
	inkscape --without-gui --file=favicon.svg --export-pdf=favicon.pdf

favicon.png: favicon.pdf
	mutool draw -c rgba -w 40 -h 40 -o favicon.png favicon.pdf

favicon-256.png: favicon.pdf
	mutool draw -c rgba -w 256 -h 256 -o favicon-256.png favicon.pdf

favicon-152.png: favicon.pdf
	mutool draw -c rgba -w 152 -h 152 -o favicon-152.png favicon.pdf

favicon-144.png: favicon.pdf
	mutool draw -c rgba -w 144 -h 144 -o favicon-144.png favicon.pdf

favicon-128.png: favicon.pdf
	mutool draw -c rgba -w 128 -h 128 -o favicon-128.png favicon.pdf

favicon-120.png: favicon.pdf
	mutool draw -c rgba -w 120 -h 120 -o favicon-120.png favicon.pdf

favicon-114.png: favicon.pdf
	mutool draw -c rgba -w 114 -h 114 -o favicon-114.png favicon.pdf

favicon-72.png: favicon.pdf
	mutool draw -c rgba -w 72 -h 72 -o favicon-72.png favicon.pdf

favicon-64.png: favicon.pdf
	mutool draw -c rgba -w 64 -h 64 -o favicon-64.png favicon.pdf

favicon-57.png: favicon.pdf
	mutool draw -c rgba -w 57 -h 57 -o favicon-57.png favicon.pdf

favicon-32.png: favicon.pdf
	mutool draw -c rgba -w 32 -h 32 -o favicon-32.png favicon.pdf

favicon-16.png: favicon.pdf
	mutool draw -c rgba -w 16 -h 16 -o favicon-16.png favicon.pdf

favicon.ico: favicon-16.png favicon-32.png favicon-64.png favicon-128.png favicon-256.png 
	convert favicon-16.png favicon-32.png favicon-64.png favicon-128.png favicon-256.png -colors 256 favicon.ico

