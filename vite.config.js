import { defineConfig } from 'vite';
import { resolve } from "path";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
    //skriv vilket plugin som används
    base: "/Projekt_Frontend/",
    plugins:[
        ViteImageOptimizer({
            png: {quality:80},
            jpeg:{quality:90},
            webp:{quality: 70},
            avif:{quality:80},
            svg: {
                plugins:[
                    {name:"removeViewBox", active:false},
                    {name: "sortAttrs"},
                ]
            }
        })
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
            }
        }
    }
});