<template>
    <vue-editor :editorToolbar="editorToolbar" :editorOptions="editorSettings"></vue-editor>
</template>

<script>
import { VueEditor, Quill } from "vue3-editor";
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css';

const icons = Quill.import('ui/icons');

icons['code'] = '<svg viewBox="0 0 24 24"><path fill="#444444" d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z"></path></svg>';

export default {
    components: {
        VueEditor
    },
    data: function() {
        return {
            documents: [],
            editorToolbar: [
              [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
              ['bold', 'italic', 'underline', 'strike', 'code'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'color': [] }, { 'background': [] }],
              ['link', 'image', 'code-block'],
              ['clean']
            ],
            editorSettings: {
                modules: {
                    syntax: {
                        highlight: (text) => hljs.highlightAuto(
                            text,
                            [
                                'json',
                                'php',
                                'javascript',
                                'apache',
                                'css',
                                'nginx',
                                'plaintext',
                                'ini'
                            ]
                        ).value
                    }
                }
            }
        }
    },
    mounted() {
        const _this = this;

        this.$api.documents.getDocumentList().then((response) => {
            _this.documents = response.map(i => ({
                value: i.name,
                id: i.uuid
            }));
        });
    }
}
</script>

<style>
.quillWrapper {
    background-color: #FFFFFF;
}

.ql-editor p {
    margin-bottom: 1rem !important;
}

.ql-editor ol, .ql-editor ul {
    margin-bottom: 1rem !important;
}
</style>