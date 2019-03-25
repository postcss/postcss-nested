import { Plugin } from 'postcss';

interface Options {
  bubble?: string[];
  unwrap?: string[];
  preserveEmpty?: boolean;
}

export default function(options?: Options): Plugin<any>;
