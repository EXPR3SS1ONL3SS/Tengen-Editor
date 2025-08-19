///--- DO NOT IMPORT ANY EXTERNAL LIBRARIES IN THIS SCRIPT ---\\\

function validFileType(lang:string) {
    
    if (lang.localeCompare("js") || lang.localeCompare("ts") || lang.includes("sx")) {
        return true
    }
    if (lang.localeCompare("py")) return true;
    if (lang.localeCompare("swift")) return true;
    if (lang.includes("lua")) return true;
}

var username, password, userData;
const udata_base = {
    username: '',
    password: '',
    last_used: Date.now(),
    theme_data: {
        uintcf: {
            background: '#305d8dff',
            files: 'Default'
        },
        font: {
            face: 'JetBrains Mono',
            size: 13.3,
        }
    },
    editor: {
        data: {
            /** 
             * tabs: ["workspace/.."] -- workspace: workspace name, folder or file path, must end at some point with a valid extension
            */
            tabs: [
                {
                    path: 'tengen/welcome_msg.txt',
                    num: 0,
                    active: false
                }
            ],
            curtab: 0,
            workspace: {
                starting: [
                    {
                        name: "basics",
                        type: "folder",
                        children: [

                        ],
                    }
                ]
            }
        }
    }
    
}

type udata = typeof udata_base



var tab = (data: Record<any, any> | string) => {
    if (data) {
        if (data instanceof String) {

        } else if (data instanceof Object) {
            if (Object.hasOwn(data, 'username')) { //userData object
                let typedData: udata = data as udata;
                if (typedData.editor.data.tabs.length > 0) {
                    let dat: {path:string,num:number,active:boolean}[] = typedData.editor.data.tabs
                    for (const t of dat) {
                        var split = t.path.split("/")
                        var last
                    }
                }
            } else { //im gonna assume its 

            }
        }
    }
}
