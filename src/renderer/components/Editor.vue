<template>
    <vue-editor :editorToolbar="editorToolbar" :editorOptions="editorSettings"></vue-editor>
</template>

<script>
import { VueEditor } from "vue3-editor";
import hljs from 'highlight.js'
import 'highlight.js/styles/nord.css'

export default {
    components: {
        VueEditor
    },
    data: function() {
        return {
            documents: [],
            editorToolbar: [
              [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'color': [] }, { 'background': [] }],
              ['link', 'image', 'code-block'],
              ['clean']
            ],
            editorSettings: {
                modules: {
                    syntax: {
                        highlight: text => hljs.highlightAuto(text).value
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
.ql-editor p {
    margin-bottom: 1rem !important;
}

.ql-editor ol, .ql-editor ul {
    margin-bottom: 1rem !important;
}
</style>