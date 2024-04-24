<template>
    <vue-editor
        :id="id"
        :editorToolbar="editorToolbar"
        :disabled="readonly"
        :editorOptions="editorSettings"
    />
</template>

<script>
import { VueEditor, Quill } from "vue3-editor";
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css';

const icons = Quill.import('ui/icons');

icons['code'] = '<svg viewBox="0 0 24 24"><path fill="#444444" d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z"></path></svg>';

export default {
    props: {
        readonly: {
            type: Boolean,
            default: false
        }
    },
    components: {
        VueEditor
    },
    data: function() {
        return {
            documents: [],
            observer: null,
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
    setup(){
        return {
            id: 'e' + (Math.random() + 1).toString(36).substring(7)
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

        // this.observer = new IntersectionObserver((entries) => {
        //     // If intersectionRatio is 0, the target is out of view
        //     // and we do not need to do anything.
        //     if (entries[0].intersectionRatio > 0) {
        //         document.getElementById(_this.id).classList.remove('sticky-toolbar');
        //     } else {
        //         document.getElementById(_this.id).classList.add('sticky-toolbar')
        //     }
        // });

        // // start observing
        // this.observer.observe(document.getElementById(_this.id));
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

.sticky-toolbar {
    position: fixed;
    top: 64px;
    left: 288px;
    background: white;
    width: calc(100% - 320px);
    z-index: 1000;
}

.ql-editor ol, .ql-editor ul {
    margin-bottom: 1rem !important;
}
</style>