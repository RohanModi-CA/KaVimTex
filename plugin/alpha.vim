if exists('g:loaded_alpha') | finish | endif " prevent loading file twicelet s:save_cpo = &cpo " save user coptions
set cpo&vim           " reset them to defaults" command to run our plugin

command! KVTStartServer lua require("vim_server").server() 

let &cpo = s:save_cpo " and restore after
unlet s:save_cpolet g:loaded_alpha = 1
