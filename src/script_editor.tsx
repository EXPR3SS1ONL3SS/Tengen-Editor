import { exec, ExecException } from "child_process";
import { error, log} from "console";
type tabdata = {path:string,num:number,active:boolean}

while (userData !== undefined) continue;
// i GENUINELY hate my life.
let keywords = {
    js: [] as Array<string>,
}



setInterval(()=>{
    let langs = Object.keys(keywords) as Array<string>
    langs.forEach(lang => {
        let data = userData as udata
        let tabs = data.editor.data.tabs as Array<any>
        if (tabs.length === 0) return;
        tabs.forEach(_ => {
            const data = _ as tabdata
            let path_splits = data.path.split("/") as Array<string>
            let last = path_splits[path_splits.length] as string
            if (!last.includes(".")) return;
            if (!validFileType(last.substring(last.search(".")+1))) return;
        })
    });
}, 44)

function execute(lang="sh", source?: string) {
    const callback = (err: ExecException|null,stdout: string, stderr: string) => {
        if (err) {
            error(stderr)
        } else {
            log(stdout)
        }
    };
    const langprefixes = {}
    let tempfile = new File([((langprefixes[lang]+" " || "$ ")as string)+source], "temp."+lang)
    try {
        exec(tempfile.webkitRelativePath, callback)
    } catch (err) {
        error(err)
    }
}

