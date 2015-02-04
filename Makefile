STATA ?=  /W/2014/forWebTool/
DEPLOY_MAIN ?= /B/mapping-americas-futures/data/
DEPLOY_ALT ?= /B/bsouthga/projections/data/
DEV ?= /D/UrbanGit/projections/app/data/

DATA_FOLDERS := states Charts Map Download
COPY_DIRS := $(DEPLOY_MAIN) $(DEPLOY_ALT) $(DEV)

data:
	# for each folder with data we wish to copy \
	for folder in $(DATA_FOLDERS) ; do \
		# create a tarball \
		TARF=$$folder.tar.gz; \
		(cd $(STATA); tar czfP $$TARF $$folder -v); \
		# copy the tarball to each production / dev server \
		for cpdir in $(COPY_DIRS) ; do \
			cp $(STATA)$$TARF $$cpdir$$TARF -v; \
			# unzip the tarball and remove the original \
			(cd $$cpdir ; tar -xzf $$TARF; rm $$TARF); \
		done ; \
		# cleanup \
		(cd $(STATA); rm $$TARF;) \
	done

.PHONY: data

