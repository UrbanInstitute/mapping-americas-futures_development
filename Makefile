
STATA ?=  W:/2014/forWebTool/

DEPLOY_MAIN ?= B:/bsouthga/projections/data/
DEPLOY_ALT ?= B:/mapping-americas-futures/data/

DEV ?= D:/UrbanGit/projections/app/data/

DATA_FOLDERS := states Charts Map Download

data:

	for folder in $(DATA_FOLDERS) ; do \
		cp $(STATA)$$folder $(DEPLOY_MAIN) -r -v; \
		cp $(STATA)$$folder $(DEPLOY_ALT) -r -v; \
		cp $(STATA)$$folder $(DEV) -r -v; \
	done

.PHONY: data